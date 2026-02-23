from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, field_validator
from langchain_core.messages import AIMessage, HumanMessage

from app.models.state import AgentState, AgentDecision, LoanApplicationDetails, ToolCall
from app.services.llm_service import get_llm_service, LLMConfigError, LLMServiceError
from app.services.tools import calculate_emi, analyze_purpose, check_affordability, analyze_fraud_tool, verify_kyc_tool, fetch_credit_score_tool
from app.services.sanction_service import generate_sanction_letter_pdf
from app.services.offer_mart_service import find_customer_offer


class SalesExtraction(BaseModel):
    employment_type: Optional[str] = None
    monthly_income: Optional[float] = None
    requested_amount: Optional[float] = None
    tenure_months: Optional[int] = None
    loan_purpose: Optional[str] = None
    reply: Optional[str] = None

    @field_validator("monthly_income", "requested_amount", mode="before")
    @classmethod
    def _coerce_float_like(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, list):
            if not v:
                return None
            v = v[0]
        if isinstance(v, str):
            cleaned = v.replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return v
        return v

    @field_validator("tenure_months", mode="before")
    @classmethod
    def _coerce_tenure(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, list):
            if not v:
                return None
            v = v[0]
        if isinstance(v, str):
            match = re.search(r"\d+", v)
            if match:
                return int(match.group(0))
            return v
        return v

    @field_validator("loan_purpose", "reply", mode="before")
    @classmethod
    def _coerce_text_like(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, list):
            if not v:
                return None
            v = v[0]
        if isinstance(v, (int, float)):
            return str(v)
        return v


class VerificationExtraction(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    consent: Optional[bool] = None
    otp: Optional[str] = None
    reply: Optional[str] = None

    @field_validator("full_name", "mobile", "email", "pan", "aadhaar", "otp", "reply", mode="before")
    @classmethod
    def _coerce_string_like(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, list):
            if not v:
                return None
            v = v[0]
        if isinstance(v, (int, float)):
            return str(v)
        return v

    @field_validator("consent", mode="before")
    @classmethod
    def _coerce_bool_like(cls, v: Any) -> Any:
        if v is None:
            return None
        if isinstance(v, list):
            if not v:
                return None
            v = v[0]
        if isinstance(v, str):
            lowered = v.strip().lower()
            if lowered in {"yes", "y", "true", "1", "consent", "agree"}:
                return True
            if lowered in {"no", "n", "false", "0", "deny", "disagree"}:
                return False
        return v


def _last_user_message(state: AgentState) -> str:
    for msg in reversed(state.get("messages", [])):
        if isinstance(msg, HumanMessage):
            return msg.content or ""
    return ""


def _append_tool_call(state: AgentState, name: str, args: Dict[str, Any], result: str, success: bool = True, error: Optional[str] = None) -> List[ToolCall]:
    tool_calls = list(state.get("tool_calls", []))
    tool_calls.append(
        ToolCall(
            tool_name=name,
            arguments=args,
            result=result,
            success=success,
            error_message=error,
        )
    )
    return tool_calls


def _extract_number(text: str) -> Optional[float]:
    if not text:
        return None
    match = re.search(r"(\d[\d,]*\.?\d*)", text.replace("₹", "").replace("â‚¹", "").replace("rs", ""))
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def _extract_tenure_months(text: str) -> Optional[int]:
    if not text:
        return None
    match = re.search(r"(\d+)\s*(months|month|mos|m)\b", text.lower())
    if match:
        return int(match.group(1))
    match = re.search(r"(\d+)\s*(years|year|yrs|yr)\b", text.lower())
    if match:
        return int(match.group(1)) * 12
    return None


def _extract_employment_type(text: str) -> Optional[str]:
    if not text:
        return None
    lowered = text.lower()
    if "salaried" in lowered:
        return "salaried"
    if "self" in lowered and "employ" in lowered:
        return "self_employed"
    if "freelanc" in lowered:
        return "freelancer"
    if "unemploy" in lowered:
        return "unemployed"
    return None


def _extract_email(text: str) -> Optional[str]:
    if not text:
        return None
    match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
    return match.group(0) if match else None


def _extract_pan(text: str) -> Optional[str]:
    if not text:
        return None
    match = re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", text.upper())
    return match.group(0) if match else None


def _extract_aadhaar(text: str) -> Optional[str]:
    if not text:
        return None
    match = re.search(r"\b\d{4}\s?\d{4}\s?\d{4}\b", text)
    return match.group(0).replace(" ", "") if match else None


def _extract_mobile(text: str) -> Optional[str]:
    if not text:
        return None
    match = re.search(r"\b\d{10}\b", text)
    return match.group(0) if match else None


def _extract_consent(text: str) -> Optional[bool]:
    lowered = (text or "").strip().lower()
    if not lowered:
        return None
    yes_tokens = ["yes", "i consent", "consent", "agree", "approved", "ok", "okay", "yep", "sure"]
    no_tokens = ["no", "i do not consent", "don't consent", "do not consent", "deny", "disagree"]
    if any(token in lowered for token in no_tokens):
        return False
    if any(token in lowered for token in yes_tokens):
        return True
    return None


def _build_plan(missing_fields: List[str]) -> List[str]:
    return [f"Collect {field.replace('_', ' ')}" for field in missing_fields]


def _looks_like_income_context(text: str) -> bool:
    lowered = (text or "").lower()
    markers = ["income", "salary", "per month", "monthly", "take home", "take-home"]
    return any(m in lowered for m in markers)


def _looks_like_loan_amount_context(text: str) -> bool:
    lowered = (text or "").lower()
    markers = ["borrow", "loan amount", "need", "want", "amount", "loan", "finance"]
    return any(m in lowered for m in markers)


async def sales_agent_node(state: AgentState) -> Dict[str, Any]:
    loan_data: LoanApplicationDetails = state["loan_data"]
    user_message = _last_user_message(state)
    dialogue_stage = state.get("dialogue_stage")
    application_status = state.get("application_status")

    loan_basics_complete = all(
        [
            loan_data.requested_amount,
            loan_data.tenure_months,
            loan_data.loan_purpose,
            loan_data.employment_type,
            loan_data.monthly_income,
        ]
    )
    if loan_basics_complete and (dialogue_stage in {"verification", "underwriting", "closure", "rejected"} or application_status in {"awaiting_documents", "approved", "rejected"}):
        # Sales node can only route to verification_agent/END in workflow edges.
        # Verification node will fast-forward to underwriting when already verified.
        next_step = "verification_agent"
        return {
            "messages": [],
            "loan_data": loan_data,
            "next_step": next_step,
            "dialogue_stage": dialogue_stage or "verification",
            "plan": state.get("plan", []),
            "current_goal": state.get("current_goal") or "Continue current stage",
            "interrupt_signal": state.get("interrupt_signal"),
            "agent_thoughts": list(state.get("agent_thoughts", []))[-2:] + ["Sales stage already complete; skipping repeat transition."],
            "tool_calls": list(state.get("tool_calls", [])),
            "updated_at": datetime.utcnow().isoformat(),
        }

    missing = []
    if not loan_data.requested_amount:
        missing.append("requested_amount")
    if not loan_data.tenure_months:
        missing.append("tenure_months")
    if not loan_data.loan_purpose:
        missing.append("loan_purpose")
    if not loan_data.employment_type:
        missing.append("employment_type")
    if not loan_data.monthly_income:
        missing.append("monthly_income")

    extraction = None
    try:
        llm = get_llm_service()
        extraction = await llm.achat_structured(
            [{"role": "user", "content": user_message}],
            SalesExtraction,
            system_prompt=(
                "Extract any loan details from the user's message. "
                "Return only provided values. Do not guess."
            ),
        )
    except Exception:
        extraction = SalesExtraction()

    employment_type = extraction.employment_type or _extract_employment_type(user_message)
    monthly_income = extraction.monthly_income if (missing and missing[0] == "monthly_income") else None
    requested_amount = extraction.requested_amount if (missing and missing[0] == "requested_amount") else None
    tenure_months = extraction.tenure_months or _extract_tenure_months(user_message)
    loan_purpose = extraction.loan_purpose
    extracted_number = _extract_number(user_message)

    if extracted_number is not None:
        if _looks_like_income_context(user_message):
            monthly_income = monthly_income or extracted_number
        elif _looks_like_loan_amount_context(user_message):
            requested_amount = requested_amount or extracted_number
        elif missing and missing[0] == "requested_amount":
            requested_amount = requested_amount or extracted_number
        elif missing and missing[0] == "monthly_income":
            monthly_income = monthly_income or extracted_number

    if missing and missing[0] == "loan_purpose" and not loan_purpose:
        candidate = (user_message or "").strip()
        if candidate:
            looks_like_numeric_only = bool(re.fullmatch(r"[\d,\.\s]+", candidate))
            if not looks_like_numeric_only and not _extract_tenure_months(candidate) and not _extract_employment_type(candidate):
                loan_purpose = candidate

    if employment_type:
        loan_data.employment_type = employment_type  # type: ignore[assignment]
    if monthly_income:
        loan_data.monthly_income = monthly_income
    if requested_amount:
        loan_data.requested_amount = requested_amount
    if tenure_months:
        loan_data.tenure_months = tenure_months
    if loan_purpose:
        loan_data.loan_purpose = loan_purpose.strip()

    updated_missing = []
    if not loan_data.requested_amount:
        updated_missing.append("requested_amount")
    if not loan_data.tenure_months:
        updated_missing.append("tenure_months")
    if not loan_data.loan_purpose:
        updated_missing.append("loan_purpose")
    if not loan_data.employment_type:
        updated_missing.append("employment_type")
    if not loan_data.monthly_income:
        updated_missing.append("monthly_income")

    if updated_missing:
        field = updated_missing[0]
        prompts = {
            "requested_amount": "Hi! I am your Tata Capital loan advisor. How much would you like to borrow today? (in INR)",
            "tenure_months": "Great. Over how many months would you like to repay that loan?",
            "loan_purpose": "Got it. What is the main purpose of this loan? (Medical, Wedding, Home Renovation, etc.)",
            "employment_type": "To check the best rate for you, what is your employment type? (salaried, self-employed, freelancer, unemployed)",
            "monthly_income": "And what is your current monthly income? (in INR)",
        }
        reply = prompts.get(field, "Could you share the next required detail?")
    else:
        reply = "Thanks! Moving on to verification."

    tool_calls = list(state.get("tool_calls", []))
    if loan_data.loan_purpose:
        try:
            purpose_result = await analyze_purpose.ainvoke({"purpose": loan_data.loan_purpose})
            tool_calls = _append_tool_call(
                state, "analyze_purpose", {"purpose": loan_data.loan_purpose}, str(purpose_result)
            )
            parsed = json.loads(purpose_result)
            loan_data.purpose_category = parsed.get("category")
        except Exception as exc:
            tool_calls = _append_tool_call(
                state, "analyze_purpose", {"purpose": loan_data.loan_purpose}, str(exc), success=False, error=str(exc)
            )

    if loan_data.requested_amount and loan_data.tenure_months:
        try:
            emi_result = await calculate_emi.ainvoke(
                {"principal": loan_data.requested_amount, "tenure_months": loan_data.tenure_months}
            )
            tool_calls = _append_tool_call(
                state,
                "calculate_emi",
                {"principal": loan_data.requested_amount, "tenure_months": loan_data.tenure_months},
                str(emi_result),
            )
            parsed = json.loads(emi_result)
            loan_data.calculated_emi = parsed.get("emi")
        except Exception as exc:
            tool_calls = _append_tool_call(
                state,
                "calculate_emi",
                {"principal": loan_data.requested_amount, "tenure_months": loan_data.tenure_months},
                str(exc),
                success=False,
                error=str(exc),
            )

    waiting_for_user_input = bool(updated_missing)
    next_step = "END" if waiting_for_user_input else "verification_agent"
    dialogue_stage = "discovery" if updated_missing else "verification"
    plan = _build_plan(updated_missing)
    goal = "Collect loan basics" if updated_missing else "Begin verification"

    return {
        "messages": [AIMessage(content=reply)],
        "loan_data": loan_data,
        "next_step": next_step,
        "dialogue_stage": dialogue_stage,
        "plan": plan,
        "current_goal": goal,
        "interrupt_signal": (
            {
                "type": "sales_input_required",
                "message": "More loan details required to continue.",
                "fields": updated_missing,
            }
            if waiting_for_user_input
            else None
        ),
        "agent_thoughts": [
            f"Captured: {', '.join([f for f in ['employment type','income','amount','tenure','purpose'] if f not in updated_missing]) or 'none'}",
            f"Next: {next_step}",
        ],
        "tool_calls": tool_calls,
        "updated_at": datetime.utcnow().isoformat(),
    }


async def verification_agent_node(state: AgentState) -> Dict[str, Any]:
    loan_data: LoanApplicationDetails = state["loan_data"]
    user_message = _last_user_message(state)
    existing_tool_calls = list(state.get("tool_calls", []))

    # Avoid repeating verification narration on every document-upload turn.
    # If KYC is already completed and we're in underwriting/doc collection, continue directly.
    if (
        state.get("dialogue_stage") == "underwriting"
        or state.get("application_status") == "awaiting_documents"
    ) and all(
        [
            loan_data.customer_name,
            loan_data.mobile,
            loan_data.email,
            loan_data.pan,
            loan_data.aadhaar,
            loan_data.otp_verified is True,
            loan_data.kyc_consent is True,
        ]
    ):
        return {
            "messages": [],
            "loan_data": loan_data,
            "next_step": "underwriting_agent",
            "dialogue_stage": "underwriting",
            "tool_calls": existing_tool_calls,
            "plan": ["Continue underwriting checks"],
            "current_goal": "Continue underwriting with latest documents",
            "agent_thoughts": ["KYC already verified; skipping repeat verification."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    extraction = None
    try:
        llm = get_llm_service()
        extraction = await llm.achat_structured(
            [{"role": "user", "content": user_message}],
            VerificationExtraction,
            system_prompt="Extract KYC details from the user's message. Return only provided values.",
        )
    except Exception:
        extraction = VerificationExtraction()

    if extraction.full_name:
        loan_data.customer_name = extraction.full_name.strip()
    if extraction.mobile:
        loan_data.mobile = extraction.mobile
    if extraction.email:
        loan_data.email = extraction.email
    if extraction.pan:
        loan_data.pan = extraction.pan
    if extraction.aadhaar:
        loan_data.aadhaar = extraction.aadhaar
    if extraction.consent is not None:
        loan_data.kyc_consent = extraction.consent
    elif loan_data.kyc_consent is None:
        inferred_consent = _extract_consent(user_message)
        if inferred_consent is not None:
            loan_data.kyc_consent = inferred_consent
    if extraction.otp:
        loan_data.otp_verified = True
    if not loan_data.otp_verified:
        if re.fullmatch(r"\d{6}", user_message.strip()):
            loan_data.otp_verified = True

    if not loan_data.mobile:
        loan_data.mobile = _extract_mobile(user_message)
    if not loan_data.email:
        loan_data.email = _extract_email(user_message)
    if not loan_data.pan:
        loan_data.pan = _extract_pan(user_message)
    if not loan_data.aadhaar:
        loan_data.aadhaar = _extract_aadhaar(user_message)

    # Enforce exact collection order:
    # full_name -> mobile -> otp -> email -> pan -> aadhaar -> consent
    primary_missing = []
    if not loan_data.customer_name:
        primary_missing.append("full_name")
    if not loan_data.mobile:
        primary_missing.append("mobile")

    if primary_missing:
        prompts = {
            "full_name": "Thanks! Let's get this processed. What is your full name?",
            "mobile": "What is your mobile number?",
        }
        prompt = prompts.get(primary_missing[0], "Please share the next required detail.")
        return {
            "messages": [AIMessage(content=prompt)],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "verification",
            "plan": _build_plan(primary_missing),
            "interrupt_signal": {
                "type": "verification_input_required",
                "message": "More KYC details are required.",
                "fields": primary_missing,
            },
            "current_goal": "Collect basic identity details",
            "agent_thoughts": [f"Missing: {', '.join(primary_missing)}"],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if loan_data.mobile and not loan_data.otp_verified:
        return {
            "messages": [AIMessage(content=f"I've sent a 6-digit OTP to {loan_data.mobile}. Please enter it here.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "verification",
            "interrupt_signal": {"type": "otp_required", "message": "OTP required", "fields": ["mobile"]},
            "current_goal": "Verify mobile number",
            "agent_thoughts": ["OTP verification pending."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    secondary_missing = []
    if not loan_data.email:
        secondary_missing.append("email")
    if not loan_data.pan:
        secondary_missing.append("pan")
    if not loan_data.aadhaar:
        secondary_missing.append("aadhaar")

    if secondary_missing:
        prompts = {
            "email": "What is your email address?",
            "pan": "Please enter your PAN number.",
            "aadhaar": "And your Aadhaar number.",
        }
        prompt = prompts.get(secondary_missing[0], "Please share the next required detail.")
        return {
            "messages": [AIMessage(content=prompt)],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "verification",
            "plan": _build_plan(secondary_missing),
            "interrupt_signal": {
                "type": "verification_input_required",
                "message": "More KYC details are required.",
                "fields": secondary_missing,
            },
            "current_goal": "Collect detailed KYC fields",
            "agent_thoughts": [f"Missing: {', '.join(secondary_missing)}"],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if loan_data.kyc_consent is None:
        return {
            "messages": [
                AIMessage(
                    content="Finally, do you consent to us running a quick KYC and credit bureau check to fetch your pre-approved offers?"
                )
            ],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "verification",
            "interrupt_signal": {"type": "kyc_consent", "message": "Consent required", "fields": ["kyc_consent"]},
            "current_goal": "Capture consent",
            "agent_thoughts": ["Awaiting KYC consent."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if loan_data.kyc_consent is False:
        return {
            "messages": [AIMessage(content="We're sorry, but KYC consent is mandatory to proceed.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "rejected",
            "application_status": "rejected",
            "rejection_reason": "KYC consent not provided.",
            "agent_thoughts": ["KYC consent denied."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    tool_calls = list(state.get("tool_calls", []))
    fraud_result = {}
    crm_result = {}
    try:
        fraud_result = await analyze_fraud_tool.ainvoke(
            {
                "user_id": state.get("thread_id"),
                "device_id": None,
                "ip_address": None,
                "phone": loan_data.mobile,
            }
        )
        tool_calls = _append_tool_call(state, "analyze_fraud", {"phone": loan_data.mobile}, str(fraud_result))
    except Exception as exc:
        tool_calls = _append_tool_call(state, "analyze_fraud", {"phone": loan_data.mobile}, str(exc), success=False, error=str(exc))

    try:
        crm_result = await verify_kyc_tool.ainvoke({"phone": loan_data.mobile, "address": loan_data.address})
        tool_calls = _append_tool_call(state, "verify_kyc", {"phone": loan_data.mobile}, str(crm_result))
    except Exception as exc:
        tool_calls = _append_tool_call(state, "verify_kyc", {"phone": loan_data.mobile}, str(exc), success=False, error=str(exc))

    crm_payload = json.loads(crm_result) if isinstance(crm_result, str) else crm_result
    fraud_payload = json.loads(fraud_result) if isinstance(fraud_result, str) else fraud_result

    if crm_payload.get("status") != "verified":
        return {
            "messages": [AIMessage(content="We could not verify your KYC details. Please contact support.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "rejected",
            "application_status": "rejected",
            "rejection_reason": crm_payload.get("reason", "KYC verification failed."),
            "tool_calls": tool_calls,
            "agent_thoughts": ["KYC verification failed."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if fraud_payload.get("risk_score", 0) > 70:
        return {
            "messages": [AIMessage(content="We cannot proceed due to risk signals in verification checks.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "rejected",
            "application_status": "rejected",
            "rejection_reason": "High fraud risk detected.",
            "tool_calls": tool_calls,
            "agent_thoughts": ["Fraud risk too high."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    offer = find_customer_offer(pan=loan_data.pan, phone=loan_data.mobile, customer_name=loan_data.customer_name)
    if offer:
        loan_data.preapproved_limit = float(offer["preapproved_limit"])
        loan_data.customer_id = offer.get("customer_id") or loan_data.customer_id

    return {
        "messages": [
            AIMessage(
                content="Verification completed. Proceeding to underwriting."
            )
        ],
        "loan_data": loan_data,
        "next_step": "underwriting_agent",
        "dialogue_stage": "underwriting",
        "interrupt_signal": None,
        "tool_calls": tool_calls,
        "plan": ["Run underwriting checks"],
        "current_goal": "Underwriting decision",
        "agent_thoughts": ["Verification passed."],
        "updated_at": datetime.utcnow().isoformat(),
    }


async def underwriting_agent_node(state: AgentState) -> Dict[str, Any]:
    loan_data: LoanApplicationDetails = state["loan_data"]
    tool_calls = list(state.get("tool_calls", []))

    if not loan_data.monthly_income or not loan_data.requested_amount or not loan_data.tenure_months:
        return {
            "messages": [AIMessage(content="I still need your income, loan amount, and tenure to complete underwriting.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "discovery",
            "interrupt_signal": {
                "type": "sales_input_required",
                "message": "Missing underwriting inputs.",
                "fields": ["monthly_income", "requested_amount", "tenure_months"],
            },
            "agent_thoughts": ["Missing underwriting inputs."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    try:
        credit_result = await fetch_credit_score_tool.ainvoke(
            {"pan": loan_data.pan, "aadhaar": loan_data.aadhaar, "monthly_income": loan_data.monthly_income}
        )
        tool_calls = _append_tool_call(state, "fetch_credit_score", {"pan": loan_data.pan}, str(credit_result))
        parsed_credit = json.loads(credit_result)
        loan_data.credit_score = parsed_credit.get("credit_score")
    except Exception as exc:
        tool_calls = _append_tool_call(state, "fetch_credit_score", {"pan": loan_data.pan}, str(exc), success=False, error=str(exc))

    if loan_data.preapproved_limit is None:
        offer = find_customer_offer(pan=loan_data.pan, phone=loan_data.mobile, customer_name=loan_data.customer_name)
        if offer:
            loan_data.preapproved_limit = float(offer["preapproved_limit"])
            loan_data.customer_id = offer.get("customer_id") or loan_data.customer_id

    try:
        emi_result = await calculate_emi.ainvoke(
            {"principal": loan_data.requested_amount, "tenure_months": loan_data.tenure_months}
        )
        tool_calls = _append_tool_call(
            state,
            "calculate_emi",
            {"principal": loan_data.requested_amount, "tenure_months": loan_data.tenure_months},
            str(emi_result),
        )
        parsed_emi = json.loads(emi_result)
        loan_data.calculated_emi = parsed_emi.get("emi")
    except Exception as exc:
        tool_calls = _append_tool_call(
            state,
            "calculate_emi",
            {"principal": loan_data.requested_amount, "tenure_months": loan_data.tenure_months},
            str(exc),
            success=False,
            error=str(exc),
        )

    if loan_data.calculated_emi and loan_data.monthly_income:
        loan_data.affordability_ratio = round(loan_data.calculated_emi / loan_data.monthly_income, 4)
        try:
            affordability_result = await check_affordability.ainvoke(
                {
                    "monthly_income": loan_data.monthly_income,
                    "existing_emis": loan_data.existing_emis or 0,
                    "proposed_emi": loan_data.calculated_emi,
                }
            )
            tool_calls = _append_tool_call(
                state,
                "check_affordability",
                {"monthly_income": loan_data.monthly_income, "proposed_emi": loan_data.calculated_emi},
                str(affordability_result),
            )
        except Exception as exc:
            tool_calls = _append_tool_call(
                state,
                "check_affordability",
                {"monthly_income": loan_data.monthly_income, "proposed_emi": loan_data.calculated_emi},
                str(exc),
                success=False,
                error=str(exc),
            )

    # Exact PS rules:
    # 1) Reject if credit score < 700
    # 2) Approve if requested_amount <= preapproved_limit
    # 3) If requested_amount <= 2x preapproved_limit: request salary slip and approve only when EMI <= 50% salary
    # 4) Reject if requested_amount > 2x preapproved_limit
    requested_amount = float(loan_data.requested_amount or 0)
    credit_score = int(loan_data.credit_score or 0)
    preapproved_limit = float(loan_data.preapproved_limit or 0)
    docs_by_type = {}
    for doc in loan_data.documents_received:
        t = doc.get("type")
        if t:
            docs_by_type[t] = doc
    mandatory_docs = ["bank_statement", "address_proof", "selfie_pan"]
    if loan_data.employment_type == "salaried":
        mandatory_docs.insert(0, "salary_slip")

    if credit_score < 700:
        return {
            "messages": [AIMessage(content="Your credit score is below the minimum threshold. We cannot proceed with this application.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "rejected",
            "application_status": "rejected",
            "rejection_reason": "Credit score below 700.",
            "interrupt_signal": None,
            "tool_calls": tool_calls,
            "underwriting_reasoning": "Rejected as credit score is below 700.",
            "underwriting_decision": "reject",
            "underwriting_confidence": 0.9,
            "agent_thoughts": ["Rejected due to credit score threshold (<700)."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if preapproved_limit <= 0:
        return {
            "messages": [AIMessage(content="We could not find your pre-approved offer at the moment. Please try again later.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "rejected",
            "application_status": "rejected",
            "rejection_reason": "Pre-approved offer unavailable.",
            "interrupt_signal": None,
            "tool_calls": tool_calls,
            "underwriting_reasoning": "Offer mart lookup did not return a pre-approved limit.",
            "underwriting_decision": "reject",
            "underwriting_confidence": 0.8,
            "agent_thoughts": ["Offer mart did not return pre-approved limit."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if requested_amount <= preapproved_limit:
        sanction_letter = generate_sanction_letter_pdf(loan_data)
        return {
            "messages": [AIMessage(content="Great news! Your loan is approved within your pre-approved limit. Your sanction letter is ready.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "closure",
            "application_status": "approved",
            "sanction_letter_path": sanction_letter,
            "interrupt_signal": None,
            "underwriting_reasoning": "Requested amount is within pre-approved limit.",
            "underwriting_decision": "approve",
            "underwriting_confidence": 0.92,
            "tool_calls": tool_calls,
            "agent_thoughts": ["Approved instantly using pre-approved offer rule."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if requested_amount <= (2 * preapproved_limit):
        missing_docs = [d for d in mandatory_docs if d not in docs_by_type]
        unverified_docs = [
            d for d in mandatory_docs
            if d in docs_by_type and not bool(docs_by_type[d].get("verified"))
        ]
        if missing_docs or unverified_docs:
            unverified_details = {}
            for doc_type in unverified_docs:
                verification = (docs_by_type.get(doc_type) or {}).get("verification") or {}
                reason = verification.get("reason") if isinstance(verification, dict) else None
                if reason:
                    unverified_details[doc_type] = reason
            requested_docs = list(dict.fromkeys(missing_docs + unverified_docs))
            loan_data.documents_requested = [
                {
                    "type": doc,
                    "reason": "Mandatory KYC/income verification before final approval.",
                    "requested_at": datetime.utcnow().isoformat(),
                }
                for doc in requested_docs
            ]
            docs_human = ", ".join(requested_docs)
            return {
                "messages": [AIMessage(content=f"Before final decision, please upload or re-upload: {docs_human}.")],
                "loan_data": loan_data,
                "next_step": "END",
                "dialogue_stage": "underwriting",
                "application_status": "awaiting_documents",
                "interrupt_signal": {
                    "type": "document_upload",
                    "required_documents": requested_docs,
                    "message": f"Please upload required document(s): {docs_human}",
                    "missing_documents": missing_docs,
                    "unverified_documents": unverified_docs,
                    "unverified_reasons": unverified_details,
                },
                "tool_calls": tool_calls,
                "current_goal": "Collect mandatory verification documents",
                "agent_thoughts": [
                    f"Missing docs: {', '.join(missing_docs) if missing_docs else 'none'}",
                    f"Unverified docs: {', '.join(unverified_docs) if unverified_docs else 'none'}",
                ],
                "underwriting_decision": "request_documents",
                "underwriting_confidence": 0.9,
                "updated_at": datetime.utcnow().isoformat(),
            }

        max_allowed_emi = float(loan_data.monthly_income or 0) * 0.5
        current_emi = float(loan_data.calculated_emi or 0)
        if current_emi <= max_allowed_emi:
            sanction_letter = generate_sanction_letter_pdf(loan_data)
            verified_docs = [d for d in mandatory_docs if d in docs_by_type and bool((docs_by_type[d] or {}).get("verified"))]
            docs_human = ", ".join(verified_docs) if verified_docs else "required documents"
            return {
                "messages": [AIMessage(content=f"Documents verified ({docs_human}). Your loan is approved and sanction letter is generated.")],
                "loan_data": loan_data,
                "next_step": "END",
                "dialogue_stage": "closure",
                "application_status": "approved",
                "sanction_letter_path": sanction_letter,
                "interrupt_signal": None,
                "underwriting_reasoning": "Within 2x pre-approved limit and EMI <= 50% of monthly salary.",
                "underwriting_decision": "approve",
                "underwriting_confidence": 0.88,
                "tool_calls": tool_calls,
                "agent_thoughts": [f"Approved after document verification: {docs_human}."],
                "updated_at": datetime.utcnow().isoformat(),
            }

        return {
            "messages": [AIMessage(content="We cannot approve this request because the EMI exceeds 50% of your salary.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "rejected",
            "application_status": "rejected",
            "rejection_reason": "EMI exceeds 50% of monthly salary.",
            "interrupt_signal": None,
            "underwriting_reasoning": "Requested amount required salary-slip verification but EMI exceeded policy threshold.",
            "underwriting_decision": "reject",
            "underwriting_confidence": 0.9,
            "tool_calls": tool_calls,
            "agent_thoughts": ["Rejected on EMI-to-income rule (>50%)."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    return {
        "messages": [AIMessage(content="We cannot approve this request because it exceeds 2x of your pre-approved limit.")],
        "loan_data": loan_data,
        "next_step": "END",
        "dialogue_stage": "rejected",
        "application_status": "rejected",
        "rejection_reason": "Requested amount exceeds 2x pre-approved limit.",
        "interrupt_signal": None,
        "underwriting_reasoning": "Rejected as requested amount is beyond 2x pre-approved limit.",
        "underwriting_decision": "reject",
        "underwriting_confidence": 0.95,
        "tool_calls": tool_calls,
        "agent_thoughts": ["Rejected on 2x pre-approved policy rule."],
        "updated_at": datetime.utcnow().isoformat(),
    }


async def reflection_node(state: AgentState) -> Dict[str, Any]:
    reflection_count = state.get("reflection_count", 0)
    if state.get("interrupt_signal"):
        return {
            "messages": [AIMessage(content="Waiting for required user input to continue.")],
            "next_step": "END",
            "dialogue_stage": state.get("dialogue_stage", "discovery"),
            "agent_thoughts": ["Reflection paused due to pending user interrupt."],
            "updated_at": datetime.utcnow().isoformat(),
        }
    if reflection_count >= state.get("max_reflections", 3):
        return {
            "messages": [AIMessage(content="Ending due to reflection limit.")],
            "next_step": "END",
            "dialogue_stage": state.get("dialogue_stage", "closure"),
            "agent_thoughts": ["Reflection limit reached."],
            "reflection_count": reflection_count + 1,
            "updated_at": datetime.utcnow().isoformat(),
        }

    return {
        "messages": [AIMessage(content="Reviewing the previous step to ensure everything is on track.")],
        "next_step": state.get("next_step", "sales_agent"),
        "plan": state.get("plan", []),
        "agent_thoughts": ["Reflection complete. Continuing flow."],
        "reflection_count": reflection_count + 1,
        "updated_at": datetime.utcnow().isoformat(),
    }


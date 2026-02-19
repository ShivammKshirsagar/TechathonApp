from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel
from langchain_core.messages import AIMessage, HumanMessage

from app.models.state import AgentState, AgentDecision, LoanApplicationDetails, ToolCall
from app.services.llm_service import get_llm_service, LLMConfigError, LLMServiceError
from app.services.tools import calculate_emi, analyze_purpose, check_affordability, analyze_fraud_tool, verify_kyc_tool, fetch_credit_score_tool
from app.services.sanction_service import generate_sanction_letter_data


class SalesExtraction(BaseModel):
    employment_type: Optional[str] = None
    monthly_income: Optional[float] = None
    requested_amount: Optional[float] = None
    tenure_months: Optional[int] = None
    loan_purpose: Optional[str] = None
    reply: Optional[str] = None


class VerificationExtraction(BaseModel):
    full_name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    consent: Optional[bool] = None
    otp: Optional[str] = None
    reply: Optional[str] = None


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
    match = re.search(r"(\d[\d,]*\.?\d*)", text.replace("₹", "").replace("rs", ""))
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


def _build_plan(missing_fields: List[str]) -> List[str]:
    return [f"Collect {field.replace('_', ' ')}" for field in missing_fields]


async def sales_agent_node(state: AgentState) -> Dict[str, Any]:
    loan_data: LoanApplicationDetails = state["loan_data"]
    user_message = _last_user_message(state)

    missing = []
    if not loan_data.employment_type:
        missing.append("employment_type")
    if not loan_data.monthly_income:
        missing.append("monthly_income")
    if not loan_data.requested_amount:
        missing.append("requested_amount")
    if not loan_data.tenure_months:
        missing.append("tenure_months")
    if not loan_data.loan_purpose:
        missing.append("loan_purpose")

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
    except (LLMConfigError, LLMServiceError):
        extraction = SalesExtraction()

    employment_type = extraction.employment_type or _extract_employment_type(user_message)
    monthly_income = extraction.monthly_income or _extract_number(user_message)
    requested_amount = extraction.requested_amount or None
    tenure_months = extraction.tenure_months or _extract_tenure_months(user_message)
    loan_purpose = extraction.loan_purpose

    if requested_amount is None and monthly_income and "borrow" in user_message.lower():
        requested_amount = _extract_number(user_message)
    if requested_amount is None and loan_data.requested_amount is None:
        requested_amount = _extract_number(user_message)

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
    if not loan_data.employment_type:
        updated_missing.append("employment_type")
    if not loan_data.monthly_income:
        updated_missing.append("monthly_income")
    if not loan_data.requested_amount:
        updated_missing.append("requested_amount")
    if not loan_data.tenure_months:
        updated_missing.append("tenure_months")
    if not loan_data.loan_purpose:
        updated_missing.append("loan_purpose")

    reply = extraction.reply if extraction and extraction.reply else None
    if not reply:
        if updated_missing:
            field = updated_missing[0]
            prompts = {
                "employment_type": "First, let me know your employment type (salaried, self-employed, freelancer, unemployed).",
                "monthly_income": "What is your monthly income? (in ₹)",
                "requested_amount": "How much would you like to borrow? (in ₹)",
                "tenure_months": "Select your preferred loan tenure (in months).",
                "loan_purpose": "What is the purpose of the loan?",
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

    next_step = "sales_agent" if updated_missing else "verification_agent"
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

    extraction = None
    try:
        llm = get_llm_service()
        extraction = await llm.achat_structured(
            [{"role": "user", "content": user_message}],
            VerificationExtraction,
            system_prompt="Extract KYC details from the user's message. Return only provided values.",
        )
    except (LLMConfigError, LLMServiceError):
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

    missing_fields = []
    if not loan_data.customer_name:
        missing_fields.append("full_name")
    if not loan_data.mobile:
        missing_fields.append("mobile")
    if not loan_data.email:
        missing_fields.append("email")
    if not loan_data.pan:
        missing_fields.append("pan")
    if not loan_data.aadhaar:
        missing_fields.append("aadhaar")

    if missing_fields:
        prompts = {
            "full_name": "Great! Now I need some personal details. What is your full name?",
            "mobile": "Please enter your mobile number:",
            "email": "What is your email address?",
            "pan": "Please enter your PAN number:",
            "aadhaar": "Please enter your Aadhaar number:",
        }
        prompt = prompts.get(missing_fields[0], "Please share the next required detail.")
        return {
            "messages": [AIMessage(content=prompt)],
            "loan_data": loan_data,
            "next_step": "verification_agent",
            "dialogue_stage": "verification",
            "plan": _build_plan(missing_fields),
            "current_goal": "Collect KYC details",
            "agent_thoughts": [f"Missing: {', '.join(missing_fields)}"],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if loan_data.mobile and not loan_data.otp_verified:
        return {
            "messages": [AIMessage(content=f"We've sent a 6-digit OTP to {loan_data.mobile}. Please enter it to verify:")],
            "loan_data": loan_data,
            "next_step": "verification_agent",
            "dialogue_stage": "verification",
            "interrupt_signal": {"type": "otp_required", "message": "OTP required", "fields": ["mobile"]},
            "current_goal": "Verify mobile number",
            "agent_thoughts": ["OTP verification pending."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if loan_data.kyc_consent is None:
        return {
            "messages": [
                AIMessage(
                    content="Do you consent to KYC verification and credit bureau checks? This is required to process your loan application."
                )
            ],
            "loan_data": loan_data,
            "next_step": "verification_agent",
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

    return {
        "messages": [AIMessage(content="Verification completed. Proceeding to underwriting.")],
        "loan_data": loan_data,
        "next_step": "underwriting_agent",
        "dialogue_stage": "underwriting",
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
            "next_step": "sales_agent",
            "dialogue_stage": "discovery",
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

    docs_received = {doc.get("type") for doc in loan_data.documents_received}
    required_docs = {"salary_slip", "bank_statement"}
    if loan_data.requested_amount and loan_data.requested_amount > 500000:
        required_docs.update({"address_proof", "selfie_pan"})

    if not required_docs.issubset(docs_received):
        missing_docs = sorted(required_docs - docs_received)
        loan_data.documents_requested = [
            {"type": doc, "reason": "Underwriting requirement", "requested_at": datetime.utcnow().isoformat()}
            for doc in missing_docs
        ]
        return {
            "messages": [AIMessage(content="Please upload required documents to proceed with underwriting.")],
            "loan_data": loan_data,
            "next_step": "underwriting_agent",
            "dialogue_stage": "underwriting",
            "application_status": "awaiting_documents",
            "interrupt_signal": {
                "type": "document_upload",
                "required_documents": missing_docs,
                "message": "Upload required documents to continue.",
            },
            "tool_calls": tool_calls,
            "current_goal": "Collect documents",
            "agent_thoughts": [f"Missing documents: {', '.join(missing_docs)}"],
            "updated_at": datetime.utcnow().isoformat(),
        }

    decision = "approved"
    confidence = 0.72
    reasoning = "Income and credit profile within acceptable range."
    if loan_data.credit_score and loan_data.credit_score < 650:
        decision = "manual_review"
        confidence = 0.55
        reasoning = "Credit score below preferred threshold."
    if loan_data.affordability_ratio and loan_data.affordability_ratio > 0.6:
        decision = "rejected"
        confidence = 0.8
        reasoning = "Affordability ratio too high."

    agent_decision = AgentDecision(
        decision=decision,
        confidence=confidence,
        reasoning=reasoning,
        alternative_actions=["manual_review", "request_documents"],
        risks_identified=[],
        mitigating_factors=[],
    )

    if decision == "approved":
        sanction_letter = generate_sanction_letter_data(loan_data)
        return {
            "messages": [AIMessage(content="Great news! Your loan has been approved. Generating your sanction letter.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "closure",
            "application_status": "approved",
            "sanction_letter_path": sanction_letter,
            "underwriting_reasoning": agent_decision.reasoning,
            "underwriting_decision": "approve",
            "underwriting_confidence": agent_decision.confidence,
            "tool_calls": tool_calls,
            "agent_thoughts": ["Approved based on affordability and credit score."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    if decision == "rejected":
        return {
            "messages": [AIMessage(content="We cannot approve this request based on the underwriting review.")],
            "loan_data": loan_data,
            "next_step": "END",
            "dialogue_stage": "rejected",
            "application_status": "rejected",
            "rejection_reason": reasoning,
            "underwriting_reasoning": agent_decision.reasoning,
            "underwriting_decision": "reject",
            "underwriting_confidence": agent_decision.confidence,
            "tool_calls": tool_calls,
            "agent_thoughts": ["Rejected due to affordability risk."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    return {
        "messages": [AIMessage(content="Your application needs manual review. We will update you shortly.")],
        "loan_data": loan_data,
        "next_step": "END",
        "dialogue_stage": "closure",
        "application_status": "manual_review",
        "underwriting_reasoning": agent_decision.reasoning,
        "underwriting_decision": "manual_review",
        "underwriting_confidence": agent_decision.confidence,
        "tool_calls": tool_calls,
        "agent_thoughts": ["Manual review triggered."],
        "updated_at": datetime.utcnow().isoformat(),
    }


async def reflection_node(state: AgentState) -> Dict[str, Any]:
    reflection_count = state.get("reflection_count", 0)
    if reflection_count >= state.get("max_reflections", 3):
        return {
            "messages": [AIMessage(content="Ending due to reflection limit.")],
            "next_step": "END",
            "dialogue_stage": state.get("dialogue_stage", "closure"),
            "agent_thoughts": ["Reflection limit reached."],
            "updated_at": datetime.utcnow().isoformat(),
        }

    return {
        "messages": [AIMessage(content="Reviewing the previous step to ensure everything is on track.")],
        "next_step": state.get("next_step", "sales_agent"),
        "agent_thoughts": ["Reflection complete. Continuing flow."],
        "updated_at": datetime.utcnow().isoformat(),
    }

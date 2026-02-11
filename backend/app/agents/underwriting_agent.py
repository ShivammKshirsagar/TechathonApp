from __future__ import annotations

from typing import Any

from app.services.credit_bureau import fetch_credit_score
from app.services.emi import calculate_emi
from app.services.llm_service import LLMConfigError, LLMServiceError, ensure_json_keys, get_llm
from app.services.session_store import SessionState


def _coerce_str(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def handle_underwriting(session: SessionState) -> tuple[str, dict]:
    if session.monthly_income is None or session.requested_amount is None or session.tenure_months is None:
        return "I still need your income, loan amount, and tenure to complete underwriting.", {}

    if session.credit_score is None:
        session.credit_score = fetch_credit_score(
            pan=session.full_name or "",
            aadhaar=session.phone_number or "",
            monthly_income=session.monthly_income,
        )

    emi = calculate_emi(session.requested_amount, session.interest_rate, session.tenure_months)
    dti_ratio = None
    if session.monthly_income:
        dti_ratio = round(emi / session.monthly_income, 4)
        session.dti_ratio = dti_ratio

    underwriting_payload = {
        "requested_amount": session.requested_amount,
        "tenure_months": session.tenure_months,
        "monthly_income": session.monthly_income,
        "credit_score": session.credit_score,
        "fraud_risk_score": session.fraud_risk_score,
        "fraud_flags": session.fraud_flags,
        "salary_slip_uploaded": session.salary_slip_uploaded,
        "emi": round(emi, 2),
        "dti_ratio": dti_ratio,
    }

    system_prompt = (
        "You are an underwriting decision agent. Use the applicant signals to decide whether "
        "to approve, reject, request additional documents, or flag for manual review. "
        "Be conservative with risk. If key documents are missing, request them."
    )
    user_prompt = (
        "Applicant signals:\n"
        f"{underwriting_payload}\n\n"
        "Return JSON with:\n"
        "- decision: 'approved', 'rejected', 'needs_documents', or 'manual_review'\n"
        "- reply: short user-facing response\n"
        "- rejection_reason: string or null\n"
        "- conditions: optional string or null"
    )

    try:
        llm = get_llm()
        decision = llm.chat_json(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        decision = ensure_json_keys(decision, ["decision", "reply", "rejection_reason", "conditions"])
    except (LLMConfigError, LLMServiceError) as exc:
        return (
            "Underwriting is temporarily unavailable. Please try again shortly.",
            {"llm_error": str(exc)},
        )

    decision_value = decision.get("decision")
    reply = decision.get("reply")
    rejection_reason = _coerce_str(decision.get("rejection_reason"))

    if decision_value == "approved":
        session.application_status = "approved"
    elif decision_value == "rejected":
        session.application_status = "rejected"
        session.rejection_reason = rejection_reason or "Underwriting decision rejected the request."
    elif decision_value == "manual_review":
        session.application_status = "manual_review"
    elif decision_value == "needs_documents":
        if session.salary_slip_uploaded:
            session.application_status = "manual_review"
        else:
            session.application_status = "in_progress"
            return (
                reply if isinstance(reply, str) and reply.strip() else "Please upload your salary slip.",
                {
                    "requires_upload": True,
                    "credit_score": session.credit_score,
                    "emi": emi,
                    "dti_ratio": dti_ratio,
                },
            )

    if not isinstance(reply, str) or not reply.strip():
        if session.application_status == "approved":
            reply = "Great news! You are approved. Generating your sanction letter now."
        elif session.application_status == "rejected":
            reply = "We cannot approve this request based on the underwriting review."
        else:
            reply = "Your application needs manual review. We will update you shortly."

    return reply, {
        "credit_score": session.credit_score,
        "emi": emi,
        "dti_ratio": dti_ratio,
    }

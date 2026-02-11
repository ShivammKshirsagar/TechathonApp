from __future__ import annotations

from typing import Any

from app.services.crm_service import verify_kyc
from app.services.fraud_service import analyze_fraud
from app.services.llm_service import LLMConfigError, LLMServiceError, ensure_json_keys, get_llm
from app.services.session_store import SessionState
from app.services.text_utils import extract_phone


def _coerce_str(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _extract_inputs_with_llm(session: SessionState) -> dict[str, Any]:
    history = session.history[-12:]
    known_state = {
        "phone_number": session.phone_number,
        "address": session.address,
        "full_name": session.full_name,
        "expected_input": session.expected_input,
    }
    system_prompt = (
        "You are a KYC intake agent. Extract missing identity details from the user "
        "message. Do not invent data. Only extract what is explicitly provided."
    )
    user_prompt = (
        "Conversation history (latest last):\n"
        f"{history}\n\n"
        "Known fields:\n"
        f"{known_state}\n\n"
        "Return a JSON object with:\n"
        "- phone_number: string or null\n"
        "- address: string or null\n"
        "- full_name: string or null\n"
        "- reply: short response asking for any missing fields\n"
    )
    llm = get_llm()
    return llm.chat_json(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )


def _fallback_missing_prompt(missing: list[str]) -> str:
    if missing == ["phone_number"]:
        return "Please share your 10-digit mobile number for KYC."
    if missing == ["address"]:
        return "Please share your current address (street and city are enough)."
    return "Please share your mobile number and current address to continue."


def handle_verification(
    session: SessionState,
    message: str,
    device_id: str | None,
    ip_address: str | None,
) -> tuple[str, dict]:
    try:
        extracted = _extract_inputs_with_llm(session)
        extracted = ensure_json_keys(extracted, ["phone_number", "address", "full_name", "reply"])
    except (LLMConfigError, LLMServiceError):
        extracted = {}

    phone = _coerce_str(extracted.get("phone_number"))
    address = _coerce_str(extracted.get("address"))
    full_name = _coerce_str(extracted.get("full_name"))

    if not phone:
        phone = extract_phone(message)

    if phone:
        session.phone_number = phone
    if address:
        session.address = address
    if full_name:
        session.full_name = full_name

    missing = []
    if not session.phone_number:
        missing.append("phone_number")
    if not session.address:
        missing.append("address")

    if missing:
        reply = extracted.get("reply") if isinstance(extracted.get("reply"), str) else None
        if not reply:
            reply = _fallback_missing_prompt(missing)
        session.expected_input = "phone" if "phone_number" in missing else "address"
        return reply, {}

    session.expected_input = None

    fraud_result = analyze_fraud(
        user_id=session.session_id,
        device_id=device_id,
        ip_address=ip_address,
        phone=session.phone_number,
    )
    session.fraud_risk_score = fraud_result["risk_score"]
    session.fraud_flags = fraud_result["flags"]

    crm_result = verify_kyc(session.phone_number, session.address)

    decision_payload = {
        "fraud_result": fraud_result,
        "crm_result": crm_result,
        "session_id": session.session_id,
    }

    system_prompt = (
        "You are a verification risk analyst. Use the CRM and fraud signals to decide "
        "whether to proceed to underwriting, reject the application, or flag for manual review. "
        "If CRM status is not verified, you must reject. Provide a clear, short response."
    )
    user_prompt = (
        "Signals:\n"
        f"{decision_payload}\n\n"
        "Return JSON with:\n"
        "- decision: 'proceed', 'reject', or 'manual_review'\n"
        "- reply: short user-facing response\n"
        "- rejection_reason: string or null"
    )

    try:
        llm = get_llm()
        decision = llm.chat_json(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        decision = ensure_json_keys(decision, ["decision", "reply", "rejection_reason"])
    except (LLMConfigError, LLMServiceError) as exc:
        if crm_result.get("status") != "verified":
            session.application_status = "rejected"
            session.rejection_reason = crm_result.get("reason", "KYC verification failed.")
            return (
                "We could not verify your KYC details. Please contact support.",
                {"crm": crm_result, "fraud": fraud_result, "llm_error": str(exc)},
            )
        if fraud_result.get("risk_score", 0) > 70:
            session.application_status = "rejected"
            session.rejection_reason = "High fraud risk detected."
            return (
                "We cannot proceed due to risk signals in the verification checks.",
                {"crm": crm_result, "fraud": fraud_result, "llm_error": str(exc)},
            )
        session.stage = "underwriting"
        return (
            "Verification completed. Proceeding to underwriting.",
            {"crm": crm_result, "fraud": fraud_result, "llm_error": str(exc)},
        )

    decision_value = decision.get("decision")
    reply = decision.get("reply")
    rejection_reason = decision.get("rejection_reason")

    if decision_value == "reject":
        session.application_status = "rejected"
        session.rejection_reason = rejection_reason or "Verification risk flags."
    elif decision_value == "manual_review":
        session.application_status = "manual_review"
    else:
        session.stage = "underwriting"

    if not isinstance(reply, str) or not reply.strip():
        if session.application_status == "rejected":
            reply = "We cannot proceed after verification checks."
        elif session.application_status == "manual_review":
            reply = "Your application needs manual review. We will update you shortly."
        else:
            reply = "Verification completed. Proceeding to underwriting."

    return reply, {"crm": crm_result, "fraud": fraud_result}

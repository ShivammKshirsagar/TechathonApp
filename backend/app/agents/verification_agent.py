from app.services.session_store import SessionState
from app.services.text_utils import extract_phone
from app.services.fraud_service import analyze_fraud
from app.services.crm_service import verify_kyc


def handle_verification(
    session: SessionState,
    message: str,
    device_id: str | None,
    ip_address: str | None,
) -> tuple[str, dict]:
    if session.phone_number is None:
        if session.expected_input != "phone":
            session.expected_input = "phone"
            return "Please share your 10-digit mobile number for a quick KYC check.", {}
        phone = extract_phone(message)
        if phone:
            session.phone_number = phone
            session.expected_input = "address"
            return "Thanks. Now share your current address (street and city is enough).", {}
        return "Please share your 10-digit mobile number for a quick KYC check.", {}

    if session.address is None:
        if session.expected_input != "address":
            session.expected_input = "address"
            return "Kindly provide your current address (street and city is enough).", {}
        if len(message.strip()) < 5:
            return "Kindly provide your current address (street and city is enough).", {}
        session.address = message.strip()
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
    if crm_result["status"] != "verified":
        session.application_status = "rejected"
        session.rejection_reason = crm_result.get("reason", "KYC verification failed.")
        return (
            "I’m sorry, we couldn’t verify your KYC details with our CRM records.",
            {"crm": crm_result},
        )

    if session.fraud_risk_score and session.fraud_risk_score > 70:
        session.application_status = "rejected"
        session.rejection_reason = "High fraud risk detected."
        return (
            "I’m sorry, but we can’t proceed due to risk signals in the verification checks.",
            {"fraud": fraud_result},
        )

    return "Thanks! Verification looks good. I’ll run the underwriting checks now.", {
        "fraud": fraud_result,
        "crm": crm_result,
    }

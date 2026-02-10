from app.services.session_store import SessionState
from app.services.credit_bureau import fetch_credit_score
from app.services.emi import calculate_emi


def compute_preapproved_limit(monthly_income: float, credit_score: int) -> float:
    income_multiplier = 12 if credit_score >= 750 else 10
    return monthly_income * income_multiplier


def handle_underwriting(session: SessionState) -> tuple[str, dict]:
    if session.monthly_income is None or session.requested_amount is None or session.tenure_months is None:
        return "I still need your income, loan amount, and tenure to complete underwriting.", {}

    if session.credit_score is None:
        session.credit_score = fetch_credit_score(
            pan=session.full_name or "",
            aadhaar=session.phone_number or "",
            monthly_income=session.monthly_income,
        )

    if session.credit_score < 700:
        session.application_status = "rejected"
        session.rejection_reason = "Credit score below 700."
        return (
            "Thanks for your patience. Based on the credit bureau check, we can’t approve this loan right now. "
            "If you’d like, I can suggest steps to improve eligibility.",
            {"credit_score": session.credit_score},
        )

    if session.preapproved_limit is None:
        session.preapproved_limit = compute_preapproved_limit(
            session.monthly_income, session.credit_score
        )

    requested = session.requested_amount
    preapproved = session.preapproved_limit

    if requested > 2 * preapproved:
        session.application_status = "rejected"
        session.rejection_reason = "Requested amount exceeds eligibility."
        return (
            "I’m sorry, the requested amount is beyond your eligibility right now. "
            "Would you like to explore a lower amount or longer tenure to make this work?",
            {"credit_score": session.credit_score, "preapproved_limit": preapproved},
        )

    if requested <= preapproved:
        session.application_status = "approved"
        return (
            "Great news! You’re pre-approved for this amount. I’m generating your sanction letter now.",
            {"credit_score": session.credit_score, "preapproved_limit": preapproved},
        )

    if not session.salary_slip_uploaded:
        return (
            "You’re very close to approval. Please upload your latest salary slip so I can finalize eligibility.",
            {
                "requires_upload": True,
                "credit_score": session.credit_score,
                "preapproved_limit": preapproved,
            },
        )

    emi = calculate_emi(requested, session.interest_rate, session.tenure_months)
    if emi <= 0.5 * session.monthly_income:
        session.application_status = "approved"
        return (
            "Thanks! Your salary slip checks out and the EMI is within 50% of your income. "
            "I’m approving your loan now.",
            {"credit_score": session.credit_score, "preapproved_limit": preapproved, "emi": emi},
        )

    session.application_status = "rejected"
    session.rejection_reason = "EMI exceeds affordability."
    return (
        "Based on your salary slip, the EMI would exceed 50% of your income, so we can’t approve this request. "
        "We can try a lower amount or longer tenure if you want.",
        {"credit_score": session.credit_score, "preapproved_limit": preapproved, "emi": emi},
    )

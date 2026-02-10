from datetime import datetime, timedelta
import base64
import uuid

from app.services.session_store import SessionState
from app.services.emi import calculate_emi


def generate_sanction_letter(session: SessionState) -> dict:
    now = datetime.utcnow()
    valid_until = now + timedelta(days=30)
    reference_number = f"SL-{uuid.uuid4().hex[:8].upper()}"
    raw_hash = f"{reference_number}-{session.session_id}-{now.isoformat()}".encode("utf-8")
    document_hash = base64.b64encode(raw_hash).decode("utf-8")[:32]

    amount = session.requested_amount or 0
    tenure = session.tenure_months or 0
    emi = calculate_emi(amount, session.interest_rate, tenure) if tenure else 0
    total_payable = emi * tenure if tenure else amount
    total_interest = max(total_payable - amount, 0)

    loan_offer = {
        "amount": amount,
        "interestRate": session.interest_rate,
        "emi": round(emi, 2),
        "tenure": tenure,
        "processingFee": 0,
        "apr": session.interest_rate,
        "totalInterest": round(total_interest, 2),
        "totalPayable": round(total_payable, 2),
    }

    return {
        "referenceNumber": reference_number,
        "generatedAt": now.isoformat(),
        "validUntil": valid_until.isoformat(),
        "documentHash": document_hash,
        "applicantName": session.full_name or "Applicant",
        "loanDetails": loan_offer,
    }

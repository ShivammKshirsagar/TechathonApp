from __future__ import annotations

from datetime import datetime, timedelta
import base64
import uuid

from app.models.state import LoanApplicationDetails
from app.services.emi import calculate_emi


def generate_sanction_letter_data(loan_data: LoanApplicationDetails, interest_rate: float = 12.5) -> dict:
    now = datetime.utcnow()
    valid_until = now + timedelta(days=30)
    reference_number = f"SL-{uuid.uuid4().hex[:8].upper()}"
    raw_hash = f"{reference_number}-{loan_data.customer_id or 'applicant'}-{now.isoformat()}".encode("utf-8")
    document_hash = base64.b64encode(raw_hash).decode("utf-8")[:32]

    amount = loan_data.requested_amount or 0
    tenure = loan_data.tenure_months or 0
    emi = calculate_emi(amount, interest_rate, tenure) if tenure else 0
    total_payable = emi * tenure if tenure else amount
    total_interest = max(total_payable - amount, 0)

    loan_offer = {
        "amount": amount,
        "interestRate": interest_rate,
        "emi": round(emi, 2),
        "tenure": tenure,
        "processingFee": 0,
        "apr": interest_rate,
        "totalInterest": round(total_interest, 2),
        "totalPayable": round(total_payable, 2),
    }

    return {
        "referenceNumber": reference_number,
        "generatedAt": now.isoformat(),
        "validUntil": valid_until.isoformat(),
        "documentHash": document_hash,
        "applicantName": loan_data.customer_name or "Applicant",
        "loanDetails": loan_offer,
    }

from __future__ import annotations

from datetime import datetime, timedelta
import base64
import uuid
from pathlib import Path

from app.models.state import LoanApplicationDetails
from app.services.emi import calculate_emi


def generate_sanction_letter_data(loan_data: LoanApplicationDetails, interest_rate: float = 12.5) -> dict:
    now = datetime.utcnow()
    valid_until = now + timedelta(days=30)
    reference_number = f"SL-{uuid.uuid4().hex[:8].upper()}"
    raw_hash = f"{reference_number}-{loan_data.customer_id or 'applicant'}-{now.isoformat()}".encode("utf-8")
    document_hash = base64.b64encode(raw_hash).decode("utf-8")[:32]

    amount = round(float(loan_data.requested_amount or 0), 2)
    tenure = int(loan_data.tenure_months or 0)
    emi = calculate_emi(amount, interest_rate, tenure) if tenure else 0
    emi_rounded = round(float(emi), 2)
    total_payable = round((emi_rounded * tenure) if tenure else amount, 2)
    total_interest = round(max(total_payable - amount, 0), 2)

    loan_offer = {
        "amount": amount,
        "interestRate": interest_rate,
        "emi": emi_rounded,
        "tenure": tenure,
        "processingFee": 0,
        "apr": interest_rate,
        "totalInterest": total_interest,
        "totalPayable": total_payable,
    }

    return {
        "referenceNumber": reference_number,
        "referenceNo": reference_number,
        "generatedAt": now.isoformat(),
        "date": now.date().isoformat(),
        "validUntil": valid_until.isoformat(),
        "documentHash": document_hash,
        "applicantName": loan_data.customer_name or "Applicant",
        "loanDetails": loan_offer,
    }


def generate_sanction_letter_pdf(loan_data: LoanApplicationDetails, interest_rate: float = 12.5) -> dict:
    """Generate sanction letter PDF on disk and return metadata + path."""
    data = generate_sanction_letter_data(loan_data, interest_rate=interest_rate)
    sanctions_dir = Path("uploads") / "sanctions"
    sanctions_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{data['referenceNumber']}.pdf"
    file_path = sanctions_dir / filename

    html = f"""
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {{ font-family: Arial, sans-serif; margin: 24px; color: #222; }}
          h1 {{ font-size: 22px; margin-bottom: 4px; }}
          .muted {{ color: #666; font-size: 12px; margin-bottom: 16px; }}
          table {{ border-collapse: collapse; width: 100%; margin-top: 12px; }}
          td, th {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
          th {{ background: #f3f3f3; }}
        </style>
      </head>
      <body>
        <h1>Personal Loan Sanction Letter</h1>
        <div class="muted">Reference: {data['referenceNumber']} | Generated: {data['generatedAt']}</div>
        <p>Dear {data['applicantName']},</p>
        <p>Your personal loan application is approved subject to standard terms below.</p>
        <table>
          <tr><th>Loan Amount</th><td>INR {data['loanDetails']['amount']}</td></tr>
          <tr><th>Interest Rate</th><td>{data['loanDetails']['interestRate']}%</td></tr>
          <tr><th>Tenure (months)</th><td>{data['loanDetails']['tenure']}</td></tr>
          <tr><th>Monthly EMI</th><td>INR {data['loanDetails']['emi']}</td></tr>
          <tr><th>Total Interest</th><td>INR {data['loanDetails']['totalInterest']}</td></tr>
          <tr><th>Total Payable</th><td>INR {data['loanDetails']['totalPayable']}</td></tr>
          <tr><th>Valid Until</th><td>{data['validUntil']}</td></tr>
        </table>
      </body>
    </html>
    """

    try:
        from weasyprint import HTML  # lazy import

        HTML(string=html).write_pdf(str(file_path))
        data["pdfPath"] = str(file_path.absolute())
        return data
    except Exception:
        # Fallback if PDF generation fails in local environment.
        txt_fallback = sanctions_dir / f"{data['referenceNumber']}.txt"
        txt_fallback.write_text(html, encoding="utf-8")
        data["pdfPath"] = str(txt_fallback.absolute())
        data["pdfFallback"] = True
        return data

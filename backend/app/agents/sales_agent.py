from app.services.session_store import SessionState
from app.services.text_utils import extract_amount, extract_tenure


def handle_sales(session: SessionState, message: str) -> str:
    lowered = message.lower()
    if "interest" in lowered or "rate" in lowered:
        return "Rates typically start around 18% APR and get better with stronger profiles. What loan amount would you like?"
    if session.requested_amount is None:
        if session.expected_input != "amount":
            session.expected_input = "amount"
            return "Great choice! To get you the best offer, what loan amount are you looking for?"
        amount = extract_amount(message)
        if amount:
            session.requested_amount = amount
            session.expected_input = "tenure"
            return "Nice. What tenure works best for you? (12, 24, 36, or 48 months)"
        return "Great choice! To get you the best offer, what loan amount are you looking for?"

    if session.tenure_months is None:
        if session.expected_input != "tenure":
            session.expected_input = "tenure"
            return "Nice. What tenure works best for you? (12, 24, 36, or 48 months)"
        tenure = extract_tenure(message)
        if tenure:
            session.tenure_months = tenure
            session.expected_input = "purpose"
            return "Got it. What’s the purpose of the loan? This helps me tailor the best rate."
        return "Nice. What tenure works best for you? (12, 24, 36, or 48 months)"

    if session.loan_purpose is None:
        if session.expected_input != "purpose":
            session.expected_input = "purpose"
            return "Got it. What’s the purpose of the loan? This helps me tailor the best rate."
        if len(message.strip()) < 3:
            return "Got it. What’s the purpose of the loan? This helps me tailor the best rate."
        session.loan_purpose = message.strip()
        session.expected_input = "income"
        return "Thanks. What’s your monthly income in INR? I’ll use it to maximize your eligibility."

    if session.monthly_income is None:
        if session.expected_input != "income":
            session.expected_input = "income"
            return "Thanks. What’s your monthly income in INR? I’ll use it to maximize your eligibility."
        income = extract_amount(message)
        if income:
            session.monthly_income = income
            session.expected_input = None
            return "Perfect. For a quick KYC check, please share your 10-digit mobile number."
        return "Thanks. What’s your monthly income in INR? I’ll use it to maximize your eligibility."

    return "Perfect. For a quick KYC check, please share your 10-digit mobile number."

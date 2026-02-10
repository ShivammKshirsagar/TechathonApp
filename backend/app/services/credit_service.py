from datetime import datetime


def evaluate_credit(pan: str, aadhaar: str, monthly_income: float) -> dict:
    # Deterministic, mock-like evaluation for demo integration.
    base_score = 600
    income_multiplier = min(monthly_income / 50000, 2.0)
    score = min(850, round(base_score + (income_multiplier * 100)))
    status = "approved" if score >= 650 else "rejected"
    return {
        "status": status,
        "score": score,
        "evaluated_at": datetime.utcnow().isoformat(),
    }

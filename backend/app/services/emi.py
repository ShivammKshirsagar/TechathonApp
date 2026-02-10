def calculate_emi(principal: float, annual_rate_percent: float, tenure_months: int) -> float:
    if principal <= 0 or tenure_months <= 0:
        return 0.0
    monthly_rate = (annual_rate_percent / 100) / 12
    if monthly_rate == 0:
        return principal / tenure_months
    numerator = principal * monthly_rate * (1 + monthly_rate) ** tenure_months
    denominator = (1 + monthly_rate) ** tenure_months - 1
    return numerator / denominator

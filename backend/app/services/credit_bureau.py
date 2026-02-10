from hashlib import md5


def fetch_credit_score(pan: str | None, aadhaar: str | None, monthly_income: float | None) -> int:
    seed = f"{pan or ''}:{aadhaar or ''}:{monthly_income or 0}"
    digest = md5(seed.encode("utf-8")).hexdigest()
    base = int(digest[:2], 16)  # 0-255
    score = 650 + int(base / 255 * 250)  # 650-900
    return min(900, max(550, score))

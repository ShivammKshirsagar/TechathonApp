import re


def extract_amount(text: str) -> float | None:
    if not text:
        return None
    lowered = text.lower()
    multiplier = 1
    if "lakh" in lowered or "lac" in lowered:
        multiplier = 100000
    if "crore" in lowered:
        multiplier = 10000000

    match = re.search(r"([0-9][0-9,\.]*)", lowered)
    if not match:
        return None
    value = match.group(1).replace(",", "")
    try:
        return float(value) * multiplier
    except ValueError:
        return None


def extract_tenure(text: str) -> int | None:
    if not text:
        return None
    lowered = text.lower()
    match = re.search(r"(\d{1,2})", lowered)
    if not match:
        if "one year" in lowered:
            return 12
        if "two year" in lowered:
            return 24
        if "three year" in lowered:
            return 36
        if "four year" in lowered:
            return 48
        return None
    tenure = int(match.group(1))
    if tenure in {12, 24, 36, 48}:
        return tenure
    if tenure <= 6:
        return tenure * 12
    return None


def extract_phone(text: str) -> str | None:
    if not text:
        return None
    digits = re.sub(r"\D", "", text)
    if len(digits) >= 10:
        return digits[-10:]
    return None

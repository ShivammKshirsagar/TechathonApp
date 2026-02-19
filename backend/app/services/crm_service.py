def verify_kyc(phone: str, address: str) -> dict:
    # Dummy CRM check: always returns verified unless placeholder data is detected.
    safe_phone = phone or ""
    safe_address = address or ""
    if safe_phone.endswith("0000") or "test" in safe_address.lower():
        return {"status": "failed", "reason": "KYC mismatch in CRM"}
    return {"status": "verified"}

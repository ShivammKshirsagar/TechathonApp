def verify_kyc(phone: str, address: str) -> dict:
    # Dummy CRM check: always returns verified unless placeholder data is detected.
    if phone.endswith("0000") or "test" in address.lower():
        return {"status": "failed", "reason": "KYC mismatch in CRM"}
    return {"status": "verified"}

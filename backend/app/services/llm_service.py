def simple_sales_response(user_message: str) -> str:
    lowered = user_message.lower()
    if "loan" in lowered or "borrow" in lowered:
        return "Got it. What loan amount are you looking for?"
    if any(token in lowered for token in ["amount", "₹", "rs", "rupees"]):
        return "Thanks. What is the purpose of the loan?"
    if "purpose" in lowered or "education" in lowered or "medical" in lowered:
        return "Understood. I will start verification. Please share your PAN and Aadhaar."
    return "Thanks for the details. Please tell me your monthly income to proceed."

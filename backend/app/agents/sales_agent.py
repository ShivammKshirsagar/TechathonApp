from __future__ import annotations

from typing import Any

from app.services.llm_service import LLMConfigError, LLMServiceError, ensure_json_keys, get_llm
from app.services.session_store import SessionState
from app.services.text_utils import extract_amount, extract_tenure


def _coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _fallback_sales(session: SessionState, message: str) -> str:
    if session.requested_amount is None:
        amount = extract_amount(message)
        if amount:
            session.requested_amount = amount
            session.expected_input = "tenure"
            return "Thanks. What tenure works best for you?"
        session.expected_input = "amount"
        return "What loan amount are you looking for?"

    if session.tenure_months is None:
        tenure = extract_tenure(message)
        if tenure:
            session.tenure_months = tenure
            session.expected_input = "purpose"
            return "Got it. What is the purpose of the loan?"
        session.expected_input = "tenure"
        return "What tenure works best for you?"

    if session.loan_purpose is None:
        if len(message.strip()) >= 3:
            session.loan_purpose = message.strip()
            session.expected_input = "income"
            return "Thanks. What is your monthly income in INR?"
        session.expected_input = "purpose"
        return "What is the purpose of the loan?"

    if session.monthly_income is None:
        income = extract_amount(message)
        if income:
            session.monthly_income = income
            session.expected_input = None
            session.stage = "verification"
            return "Thanks. Please share your 10-digit mobile number for KYC."
        session.expected_input = "income"
        return "What is your monthly income in INR?"

    session.stage = "verification"
    session.expected_input = None
    return "Thanks. Please share your 10-digit mobile number for KYC."


def handle_sales(session: SessionState, message: str) -> tuple[str, dict[str, Any]]:
    history = session.history[-12:]
    known_state = {
        "requested_amount": session.requested_amount,
        "tenure_months": session.tenure_months,
        "loan_purpose": session.loan_purpose,
        "monthly_income": session.monthly_income,
        "expected_input": session.expected_input,
    }

    system_prompt = (
        "You are CodeBlitz, a lending sales agent. Your job is to gather missing "
        "loan details conversationally and keep the user engaged. Ask only one "
        "question at a time. Be concise and empathetic."
    )
    user_prompt = (
        "Conversation history (latest last):\n"
        f"{history}\n\n"
        "Known application fields:\n"
        f"{known_state}\n\n"
        "Return a JSON object with:\n"
        "- reply: the assistant response\n"
        "- updates: object with any of requested_amount, tenure_months, loan_purpose, monthly_income\n"
        "- next_stage: 'sales' or 'verification'\n"
        "- expected_input: one of 'amount', 'tenure', 'purpose', 'income', or null\n"
        "Only set updates when the user explicitly provided that info."
    )

    try:
        llm = get_llm()
        result = llm.chat_json(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
    except (LLMConfigError, LLMServiceError) as exc:
        return _fallback_sales(session, message), {"llm_error": str(exc)}

    result = ensure_json_keys(
        result,
        ["reply", "updates", "next_stage", "expected_input"],
    )
    updates = result.get("updates") or {}

    requested_amount = _coerce_float(updates.get("requested_amount"))
    tenure_months = _coerce_int(updates.get("tenure_months"))
    monthly_income = _coerce_float(updates.get("monthly_income"))
    loan_purpose = updates.get("loan_purpose")

    if requested_amount:
        session.requested_amount = requested_amount
    if tenure_months:
        session.tenure_months = tenure_months
    if monthly_income:
        session.monthly_income = monthly_income
    if isinstance(loan_purpose, str) and loan_purpose.strip():
        session.loan_purpose = loan_purpose.strip()

    next_stage = result.get("next_stage")
    if next_stage in {"sales", "verification"}:
        session.stage = next_stage

    expected_input = result.get("expected_input")
    if expected_input in {"amount", "tenure", "purpose", "income"}:
        session.expected_input = expected_input
    elif expected_input is None:
        session.expected_input = None

    reply = result.get("reply")
    if not isinstance(reply, str) or not reply.strip():
        reply = _fallback_sales(session, message)

    return reply, {"llm": {"stage": session.stage}}

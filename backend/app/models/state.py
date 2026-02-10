from typing import Annotated, List, Optional, TypedDict
from langgraph.graph.message import add_messages


class LoanApplicationState(TypedDict):
    messages: Annotated[List[dict], add_messages]

    customer_id: Optional[str]
    full_name: Optional[str]
    phone_number: Optional[str]
    language_preference: str

    requested_amount: Optional[float]
    loan_purpose: Optional[str]
    tenure_months: Optional[int]

    kyc_status: str
    credit_score: Optional[int]
    salary_slip_path: Optional[str]
    monthly_income: Optional[float]
    dti_ratio: Optional[float]

    fraud_risk_score: float
    fraud_flags: List[str]

    next_step: str
    application_status: str
    rejection_reason: Optional[str]
    sanction_letter_url: Optional[str]

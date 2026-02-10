from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional


@dataclass
class SessionState:
    session_id: str
    stage: str = "sales"
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    # Collected data
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    requested_amount: Optional[float] = None
    tenure_months: Optional[int] = None
    loan_purpose: Optional[str] = None
    monthly_income: Optional[float] = None
    expected_input: Optional[str] = "amount"

    # Underwriting data
    credit_score: Optional[int] = None
    preapproved_limit: Optional[float] = None
    fraud_risk_score: Optional[float] = None
    fraud_flags: list[str] = field(default_factory=list)
    salary_slip_uploaded: bool = False
    salary_slip_path: Optional[str] = None
    application_status: str = "in_progress"
    rejection_reason: Optional[str] = None

    # Offer
    interest_rate: float = 18.0

    def touch(self) -> None:
        self.last_updated_at = datetime.utcnow().isoformat()


_SESSIONS: Dict[str, SessionState] = {}


def get_session(session_id: str) -> SessionState:
    if session_id not in _SESSIONS:
        _SESSIONS[session_id] = SessionState(session_id=session_id)
    session = _SESSIONS[session_id]
    session.touch()
    return session


def update_session(session: SessionState) -> None:
    session.touch()
    _SESSIONS[session.session_id] = session

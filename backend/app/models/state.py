# backend/app/models/state.py
from typing import TypedDict, Annotated, Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
from langgraph.graph.message import add_messages
from datetime import datetime


class LoanApplicationDetails(BaseModel):
    """Structured data with agentic extraction tracking"""
    
    customer_id: Optional[str] = None
    customer_name: Optional[str] = Field(None, description="Full legal name")
    email: Optional[str] = None
    mobile: Optional[str] = None
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    address: Optional[str] = None
    kyc_consent: Optional[bool] = None
    otp_verified: Optional[bool] = None
    
    # Loan details
    requested_amount: Optional[float] = Field(None, description="Amount requested")
    loan_purpose: Optional[str] = Field(None, description="Purpose category")
    purpose_category: Optional[Literal["debt_consolidation", "medical", "wedding", "education", "business", "other"]] = None
    tenure_months: Optional[int] = Field(None, ge=6, le=84)
    
    # Financial profile
    employment_type: Optional[Literal["salaried", "self_employed", "freelancer", "unemployed"]] = None
    monthly_income: Optional[float] = Field(None, ge=0)
    employer_name: Optional[str] = None
    employer_tier: Optional[Literal["tier_1", "tier_2", "tier_3", "unverified"]] = None
    work_experience_years: Optional[float] = Field(None, ge=0)
    
    # Credit profile
    credit_score: Optional[int] = Field(None, ge=300, le=900)
    preapproved_limit: Optional[float] = Field(None, ge=0)
    credit_history_length: Optional[int] = None  # In months
    existing_emis: Optional[float] = Field(0, ge=0)
    dti_ratio: Optional[float] = Field(None, ge=0, le=100)
    bureau_flags: List[str] = Field(default_factory=list)
    
    # Document handling
    salary_slip_path: Optional[str] = None
    salary_slip_data: Optional[Dict] = None
    bank_statement_path: Optional[str] = None
    bank_statement_data: Optional[Dict] = None
    documents_requested: List[Dict[str, Any]] = Field(default_factory=list)  # {type, reason, requested_at}
    documents_received: List[Dict[str, Any]] = Field(default_factory=list)  # {type, path, received_at, verified}
    
    # Agentic tracking - NEW
    extraction_confidence: Dict[str, float] = Field(default_factory=dict)
    user_intent_signals: List[str] = Field(default_factory=list)
    conversation_topics: List[str] = Field(default_factory=list)  # Track discussed topics
    objections_raised: List[str] = Field(default_factory=list)  # Sales objections
    objections_handled: List[str] = Field(default_factory=list)
    
    # Calculated fields
    calculated_emi: Optional[float] = None
    affordability_ratio: Optional[float] = None  # EMI / monthly_income
    
    @property
    def is_complete(self) -> bool:
        """Check if minimum required data is present"""
        return all([
            self.requested_amount,
            self.monthly_income,
            self.loan_purpose,
            self.employment_type
        ])
    
    @property
    def risk_indicators(self) -> List[str]:
        """Auto-detect risk signals"""
        indicators = []
        if self.dti_ratio and self.dti_ratio > 50:
            indicators.append("high_dti")
        if self.credit_score and self.credit_score < 650:
            indicators.append("low_credit")
        if self.employment_type == "unemployed":
            indicators.append("no_income")
        if self.monthly_income and self.requested_amount:
            if self.requested_amount / self.monthly_income > 10:
                indicators.append("high_leverage")
        return indicators


class ToolCall(BaseModel):
    """Track tool usage by agents"""
    tool_name: str
    arguments: Dict[str, Any]
    result: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    success: bool = True
    error_message: Optional[str] = None


class AgentState(TypedDict):
    """Full agent state with comprehensive metadata"""
    
    # Core data
    messages: Annotated[list, add_messages]
    loan_data: LoanApplicationDetails
    
    # Agentic control flow - agents write these
    next_step: str  # Where the agent wants to go next
    dialogue_stage: Literal["discovery", "consultation", "verification", "underwriting", "closure", "rejected"]
    
    # Agent reasoning - NEW
    agent_thoughts: List[str]  # Chain-of-thought logging
    tool_calls: List[ToolCall]  # Track all tool invocations
    plan: List[str]  # Current execution plan
    current_goal: Optional[str]  # What the agent is trying to achieve now
    
    # Safety controls
    interrupt_signal: Optional[Dict[str, Any]]
    reflection_count: Annotated[int, lambda x, y: x + 1]  # Auto-increment
    max_reflections: int = 3  # Prevent infinite loops
    last_agent_action: Optional[str]
    
    # Risk and compliance
    fraud_risk_score: Optional[int]
    fraud_flags: List[str]
    fraud_assessment: Optional[str]  # Detailed reasoning
    
    underwriting_reasoning: Optional[str]
    underwriting_decision: Optional[Literal["approve", "reject", "request_guarantor", "request_documents", "manual_review"]]
    underwriting_confidence: Optional[float]
    
    # Final status
    application_status: Optional[Literal["approved", "rejected", "manual_review", "in_progress", "awaiting_documents"]]
    rejection_reason: Optional[str]
    sanction_letter_path: Optional[str]
    
    # Threading
    thread_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AgentDecision(BaseModel):
    """Structured decision with full reasoning"""
    decision: str = Field(..., description="The action decided")
    confidence: float = Field(..., ge=0, le=1)
    reasoning: str = Field(..., description="Step-by-step reasoning")
    alternative_actions: List[str] = Field(default_factory=list)  # What else was considered
    risks_identified: List[str] = Field(default_factory=list)
    mitigating_factors: List[str] = Field(default_factory=list)
    tool_calls: Optional[List[Dict]] = None
    requires_human: bool = False
    human_reason: Optional[str] = None  # Why human is needed

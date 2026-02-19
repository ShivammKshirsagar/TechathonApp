from __future__ import annotations

from datetime import datetime

import pytest
from langchain_core.messages import HumanMessage

from app.graph.nodes import sales_agent_node, verification_agent_node, underwriting_agent_node
from app.models.state import LoanApplicationDetails


def _base_state():
    return {
        "messages": [],
        "loan_data": LoanApplicationDetails(),
        "next_step": "sales_agent",
        "dialogue_stage": "discovery",
        "agent_thoughts": [],
        "tool_calls": [],
        "plan": [],
        "current_goal": "",
        "interrupt_signal": None,
        "reflection_count": 0,
        "max_reflections": 3,
        "last_agent_action": None,
        "fraud_risk_score": None,
        "fraud_flags": [],
        "fraud_assessment": None,
        "underwriting_reasoning": None,
        "underwriting_decision": None,
        "underwriting_confidence": None,
        "application_status": "in_progress",
        "rejection_reason": None,
        "sanction_letter_path": None,
        "thread_id": "thread_test",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


@pytest.mark.asyncio
async def test_sales_agent_extracts_employment_type():
    state = _base_state()
    state["messages"] = [HumanMessage(content="I am salaried.")]
    result = await sales_agent_node(state)
    assert result["loan_data"].employment_type == "salaried"
    assert result["next_step"] == "sales_agent"


@pytest.mark.asyncio
async def test_verification_agent_requests_otp():
    state = _base_state()
    state["loan_data"].customer_name = "Test User"
    state["messages"] = [HumanMessage(content="9876543210")]
    result = await verification_agent_node(state)
    assert result["interrupt_signal"]["type"] == "otp_required"


@pytest.mark.asyncio
async def test_underwriting_requires_documents_for_high_amount():
    state = _base_state()
    loan_data = state["loan_data"]
    loan_data.monthly_income = 50000
    loan_data.requested_amount = 800000
    loan_data.tenure_months = 36
    state["messages"] = [HumanMessage(content="Proceed")]
    result = await underwriting_agent_node(state)
    assert result["interrupt_signal"]["type"] == "document_upload"

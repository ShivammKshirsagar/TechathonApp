from __future__ import annotations

from datetime import datetime

import pytest
from langchain_core.messages import HumanMessage

import app.graph.nodes as graph_nodes
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
    assert result["next_step"] == "END"


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
    loan_data.preapproved_limit = 500000
    loan_data.credit_score = 760
    state["messages"] = [HumanMessage(content="Proceed")]

    class StubCreditTool:
        async def ainvoke(self, _: dict):
            return '{"credit_score": 760}'

    monkey = pytest.MonkeyPatch()
    monkey.setattr(graph_nodes, "fetch_credit_score_tool", StubCreditTool())
    result = await underwriting_agent_node(state)
    monkey.undo()

    assert result["interrupt_signal"]["type"] == "document_upload"
    assert "salary_slip" in result["interrupt_signal"]["required_documents"]


@pytest.mark.asyncio
async def test_underwriting_rejects_when_credit_below_700():
    state = _base_state()
    loan_data = state["loan_data"]
    loan_data.monthly_income = 60000
    loan_data.requested_amount = 200000
    loan_data.tenure_months = 24
    loan_data.preapproved_limit = 300000
    state["messages"] = [HumanMessage(content="Proceed")]

    class StubCreditTool:
        async def ainvoke(self, _: dict):
            return '{"credit_score": 650}'

    monkey = pytest.MonkeyPatch()
    monkey.setattr(graph_nodes, "fetch_credit_score_tool", StubCreditTool())
    result = await underwriting_agent_node(state)
    monkey.undo()

    assert result["application_status"] == "rejected"
    assert result["rejection_reason"] == "Credit score below 700."


@pytest.mark.asyncio
async def test_underwriting_approves_within_preapproved_after_salary_slip():
    state = _base_state()
    loan_data = state["loan_data"]
    loan_data.monthly_income = 70000
    loan_data.requested_amount = 250000
    loan_data.tenure_months = 24
    loan_data.preapproved_limit = 300000
    loan_data.documents_received = [{"type": "salary_slip"}]
    state["messages"] = [HumanMessage(content="Proceed")]

    class StubCreditTool:
        async def ainvoke(self, _: dict):
            return '{"credit_score": 760}'

    monkey = pytest.MonkeyPatch()
    monkey.setattr(graph_nodes, "fetch_credit_score_tool", StubCreditTool())
    monkey.setattr(
        graph_nodes,
        "generate_sanction_letter_pdf",
        lambda _loan_data: {"referenceNumber": "SL-TEST", "pdfPath": "uploads/sanctions/SL-TEST.pdf"},
    )
    result = await underwriting_agent_node(state)
    monkey.undo()

    assert result["application_status"] == "approved"
    assert result["sanction_letter_path"]["referenceNumber"] == "SL-TEST"

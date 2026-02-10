from typing import Dict
from langchain_core.messages import AIMessage

from app.models.state import LoanApplicationState
from app.services.fraud_service import analyze_fraud
from app.services.llm_service import simple_sales_response


def sales_node(state: LoanApplicationState) -> Dict:
    last_user_message = ""
    if state["messages"]:
        last = state["messages"][-1]
        if isinstance(last, dict) and last.get("role") == "user":
            last_user_message = last.get("content", "")

    response = simple_sales_response(last_user_message)
    return {
        "messages": [AIMessage(content=response)],
        "next_step": "verification" if "PAN" in response else "sales",
    }


def verification_node(state: LoanApplicationState) -> Dict:
    fraud_result = analyze_fraud(
        user_id=state.get("customer_id"),
        device_id=None,
        ip_address=None,
        phone=state.get("phone_number"),
    )
    return {
        "fraud_risk_score": fraud_result["risk_score"],
        "fraud_flags": fraud_result["flags"],
        "credit_score": state.get("credit_score") or 720,
        "next_step": "document_collection",
    }


def underwriting_node(state: LoanApplicationState) -> Dict:
    if state.get("fraud_risk_score", 0) > 50:
        return {"application_status": "rejected", "rejection_reason": "High fraud risk."}
    if (state.get("credit_score") or 0) < 700:
        return {"application_status": "rejected", "rejection_reason": "Low credit score."}
    if (state.get("dti_ratio") or 0) > 0.6:
        return {"application_status": "rejected", "rejection_reason": "DTI ratio too high."}
    return {"application_status": "approved"}

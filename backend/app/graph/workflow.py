from langgraph.graph import END, StateGraph
from app.models.state import LoanApplicationState
from app.graph.nodes import sales_node, verification_node, underwriting_node


def build_graph():
    workflow = StateGraph(LoanApplicationState)
    workflow.add_node("sales_agent", sales_node)
    workflow.add_node("verification_agent", verification_node)
    workflow.add_node("underwriting_gate", underwriting_node)

    workflow.set_entry_point("sales_agent")

    def route_after_sales(state: LoanApplicationState):
        return "verification_agent" if state.get("next_step") == "verification" else "sales_agent"

    workflow.add_conditional_edges("sales_agent", route_after_sales)
    workflow.add_edge("verification_agent", "underwriting_gate")
    workflow.add_edge("underwriting_gate", END)

    return workflow.compile()

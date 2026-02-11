# backend/app/graph/workflow.py
from typing import Literal
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import AsyncPostgresSaver

from app.models.state import AgentState
from app.graph.nodes import (
    sales_agent_node,
    verification_agent_node,
    underwriting_agent_node,
    reflection_node,
)


def create_agentic_workflow(checkpointer: AsyncPostgresSaver = None):
    """Create the agentic lending workflow"""
    
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("sales_agent", sales_agent_node)
    workflow.add_node("verification_agent", verification_agent_node)
    workflow.add_node("underwriting_agent", underwriting_agent_node)
    workflow.add_node("reflection", reflection_node)
    
    # Entry point
    workflow.set_entry_point("sales_agent")
    
    # AGENTIC: Nodes decide where to go next via 'next_step' in state
    workflow.add_conditional_edges(
        "sales_agent",
        lambda state: state.get("next_step", "sales_agent"),
        {
            "sales_agent": "sales_agent",
            "verification_agent": "verification_agent",
            "reflection": "reflection",
        }
    )
    
    workflow.add_conditional_edges(
        "verification_agent",
        lambda state: state.get("next_step", "underwriting_agent"),
        {
            "underwriting_agent": "underwriting_agent",
            "reflection": "reflection",
            "END": END,
        }
    )
    
    workflow.add_conditional_edges(
        "underwriting_agent",
        lambda state: state.get("next_step", "END"),
        {
            "sales_agent": "sales_agent",  # Back to gather guarantor info
            "document_collection": "reflection",  # Via reflection for now
            "closure": END,
            "END": END,
        }
    )
    
    workflow.add_conditional_edges(
        "reflection",
        lambda state: state.get("next_step", "sales_agent"),
        {
            "sales_agent": "sales_agent",
            "END": END,
        }
    )
    
    if checkpointer:
        return workflow.compile(checkpointer=checkpointer)
    return workflow.compile()
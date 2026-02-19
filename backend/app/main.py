# backend/app/main.py
from __future__ import annotations

import uuid
import json
import re
from contextlib import asynccontextmanager
from typing import Optional, AsyncIterator, Dict, Any
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import StreamingResponse
from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.postgres import AsyncPostgresSaver
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from app.graph.workflow import create_agentic_workflow
from app.models.state import AgentState, LoanApplicationDetails, ToolCall
from app.settings import settings
from app.services.storage_service import save_upload_file


# Global state
graph = None
checkpointer = None


def _redact_pii(text: str) -> str:
    """Minimal PII redaction for logs."""
    if not text:
        return text
    text = re.sub(r"\b\d{10}\b", "**********", text)
    text = re.sub(r"\b[A-Z]{5}\d{4}[A-Z]\b", "***********", text, flags=re.IGNORECASE)
    text = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "**** **** ****", text)
    text = re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", "***@***", text)
    return text


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize with in-memory checkpointer for testing"""
    global graph, checkpointer
    
    if settings.postgres_dsn:
        checkpointer = AsyncPostgresSaver.from_conn_string(settings.postgres_dsn)
    else:
        # Use MemorySaver instead of Postgres for quick testing
        checkpointer = MemorySaver()
    graph = create_agentic_workflow(checkpointer=checkpointer)
    
    print(f"✅ Agentic workflow initialized at {datetime.utcnow()}")
    yield
    
    print("🛑 Shutting down")


app = FastAPI(
    title="CodeBlitz Agentic Lending API",
    lifespan=lifespan,
    version="2.0.0-agentic"
)


class ChatRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None
    session_id: Optional[str] = None
    device_id: Optional[str] = None
    ip_address: Optional[str] = None


def create_initial_state(thread_id: str) -> Dict[str, Any]:
    """Create fresh state for new loan application"""
    return {
        "messages": [],
        "loan_data": LoanApplicationDetails(),
        "next_step": "sales_agent",
        "dialogue_stage": "discovery",
        "agent_thoughts": [],
        "tool_calls": [],
        "plan": [],
        "current_goal": "Initial discovery: Understand customer need",
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
        "thread_id": thread_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Main agentic entry point"""
    global graph
    
    if not graph:
        raise HTTPException(503, "Service initializing, please retry")
    
    # Generate thread_id if new conversation
    thread_id = request.thread_id or request.session_id
    is_new_thread = thread_id is None
    if is_new_thread:
        thread_id = f"loan_{uuid.uuid4().hex[:12]}"
    
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # Handle new message
        return await _handle_message(thread_id, request.message, config, is_new_thread)
        
    except Exception as e:
        print(f"❌ Error: {_redact_pii(str(e))}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Internal error: {str(e)}")


async def _handle_message(
    thread_id: str, 
    message: str, 
    config: Dict[str, Any],
    is_new_thread: bool
) -> Dict[str, Any]:
    """Process new chat message through agentic workflow"""
    
    # Add user message
    inputs = {
        "messages": [HumanMessage(content=message)],
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    # Stream through graph
    final_state = None
    async for event in graph.astream(inputs, config, stream_mode="values"):
        final_state = event
        
        # Check for interrupts (agent needs human action)
        if event.get("interrupt_signal"):
            return {
                "response": event["messages"][-1].content if event["messages"] else "I need some information...",
                "requires_action": event["interrupt_signal"],
                "thread_id": thread_id,
                "status": "awaiting_input",
                "agent_thoughts": event.get("agent_thoughts", [])[-3:] if event.get("agent_thoughts") else [],
                "plan": event.get("plan", []),
                "loan_data": event.get("loan_data").model_dump(exclude_none=True) if event.get("loan_data") else {},
            }
    
    # Check for completion
    if final_state:
        status = final_state.get("application_status", "in_progress")
        
        response = {
            "response": final_state["messages"][-1].content if final_state.get("messages") else "",
            "thread_id": thread_id,
            "status": status,
            "dialogue_stage": final_state.get("dialogue_stage"),
            "agent_thoughts": final_state.get("agent_thoughts", [])[-3:] if final_state.get("agent_thoughts") else [],
            "plan": final_state.get("plan", []),
        }
        
        # Add final data if complete
        if status in ["approved", "rejected", "manual_review"]:
            loan_data = final_state.get("loan_data")
            if loan_data:
                response["loan_data"] = loan_data.model_dump(exclude_none=True) if hasattr(loan_data, 'model_dump') else loan_data
            if status == "approved":
                response["sanction_letter"] = final_state.get("sanction_letter_path")
            elif status == "rejected":
                response["rejection_reason"] = final_state.get("rejection_reason")
        
        return response
    
    raise HTTPException(500, "No state returned from workflow")


async def _register_document(
    thread_id: str,
    file_upload: UploadFile,
    doc_type: Optional[str],
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """Handle document upload and update state."""
    allowed_types = ["application/pdf", "image/jpeg", "image/png"]
    if file_upload.content_type not in allowed_types:
        raise HTTPException(400, f"Invalid file type: {file_upload.content_type}")

    saved_path = await save_upload_file(file_upload, thread_id)
    state = await checkpointer.aget(config)
    if not state:
        state = create_initial_state(thread_id)
    loan_data = state.get("loan_data") or LoanApplicationDetails()
    documents_received = list(loan_data.documents_received or [])
    documents_received.append(
        {
            "type": doc_type or "unknown",
            "path": saved_path,
            "received_at": datetime.utcnow().isoformat(),
            "verified": False,
        }
    )
    if doc_type == "salary_slip":
        loan_data.salary_slip_path = saved_path
        loan_data.salary_slip_data = {"file": saved_path, "parsed": False}
    elif doc_type == "bank_statement":
        loan_data.bank_statement_path = saved_path
        loan_data.bank_statement_data = {"file": saved_path, "parsed": False}
    elif doc_type == "address_proof":
        loan_data.documents_received[-1]["category"] = "address_proof"
    elif doc_type == "selfie_pan":
        loan_data.documents_received[-1]["category"] = "selfie_pan"
    loan_data.documents_received = documents_received
    state["loan_data"] = loan_data
    state["updated_at"] = datetime.utcnow().isoformat()
    await checkpointer.aput(config, state)

    return {
        "status": "uploaded",
        "thread_id": thread_id,
        "document_received": file_upload.filename,
        "doc_type": doc_type,
        "path": saved_path,
    }


@app.post("/chat/stream")
async def chat_stream_endpoint(
    request: ChatRequest,
):
    """
    Streaming endpoint for real-time agent responses.
    Uses SSE (Server-Sent Events) for token-by-token delivery.
    """
    global graph
    
    if not graph:
        raise HTTPException(503, "Service initializing")
    
    thread_id = request.thread_id or request.session_id
    if not thread_id:
        thread_id = f"loan_{uuid.uuid4().hex[:12]}"
    
    config = {"configurable": {"thread_id": thread_id}}
    
    async def event_generator() -> AsyncIterator[str]:
        """Generate SSE events"""
        streamed_tokens = False
        try:
            async for event in graph.astream_events(
                {"messages": [HumanMessage(content=request.message)]},
                config,
                version="v1"
            ):
                # Stream LLM tokens
                if event["event"] == "on_chat_model_stream":
                    token = event["data"]["chunk"].content
                    if token:
                        streamed_tokens = True
                        yield f"data: {json.dumps({'type': 'token', 'value': token})}\n\n"
            
            # Final state
            final_state = await checkpointer.aget(config)
            if final_state:
                if not streamed_tokens:
                    final_message = ""
                    if final_state.get("messages"):
                        final_message = final_state["messages"][-1].content or ""
                    if final_message:
                        yield f"data: {json.dumps({'type': 'token', 'value': final_message})}\n\n"
                loan_data = final_state.get("loan_data")
                meta = {
                    "thread_id": thread_id,
                    "status": final_state.get("application_status", "in_progress"),
                    "dialogue_stage": final_state.get("dialogue_stage"),
                    "agent_thoughts": final_state.get("agent_thoughts", []),
                    "plan": final_state.get("plan", []),
                    "requires_action": final_state.get("interrupt_signal"),
                    "loan_data": loan_data.model_dump(exclude_none=True) if hasattr(loan_data, "model_dump") else loan_data,
                }
                if final_state.get("sanction_letter_path"):
                    meta["sanction_letter"] = final_state.get("sanction_letter_path")
                yield f"data: {json.dumps({'type': 'meta', 'value': meta})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/loan/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    thread_id: Optional[str] = Form(None),
):
    """Document upload endpoint for agentic flow."""
    resolved_thread_id = thread_id or session_id
    if not resolved_thread_id:
        resolved_thread_id = f"loan_{uuid.uuid4().hex[:12]}"
    config = {"configurable": {"thread_id": resolved_thread_id}}
    return await _register_document(resolved_thread_id, file, doc_type, config)


@app.get("/state/{thread_id}")
async def get_state_endpoint(thread_id: str):
    """Debug endpoint: Get full current state"""
    config = {"configurable": {"thread_id": thread_id}}
    state = await checkpointer.aget(config)
    
    if not state:
        raise HTTPException(404, "Thread not found")
    
    loan_data = state.get("loan_data")
    loan_data_dict = loan_data.model_dump(exclude_none=True) if hasattr(loan_data, 'model_dump') else loan_data
    
    return {
        "thread_id": thread_id,
        "status": state.get("application_status"),
        "dialogue_stage": state.get("dialogue_stage"),
        "loan_data": loan_data_dict,
        "message_count": len(state.get("messages", [])),
        "agent_thoughts": state.get("agent_thoughts", []),
        "tool_calls": [tc.model_dump() if hasattr(tc, 'model_dump') else tc for tc in state.get("tool_calls", [])],
        "reflection_count": state.get("reflection_count", 0),
    }


@app.post("/reset/{thread_id}")
async def reset_thread_endpoint(thread_id: str):
    """Reset a thread (for testing)"""
    config = {"configurable": {"thread_id": thread_id}}
    await checkpointer.aput(config, create_initial_state(thread_id))
    return {"status": "reset", "thread_id": thread_id}


# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "agentic_mode": True,
        "workflow_initialized": graph is not None,
    }

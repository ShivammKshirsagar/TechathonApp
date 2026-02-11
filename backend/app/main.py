# backend/app/main.py
from __future__ import annotations

import os
import uuid
import json
from contextlib import asynccontextmanager
from typing import Optional, AsyncIterator, Dict, Any
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from langchain_core.messages import HumanMessage

from app.graph.workflow import create_agentic_workflow
from app.models.state import AgentState, LoanApplicationDetails, ToolCall


# Global state
graph = None
checkpointer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize with in-memory checkpointer for testing"""
    global graph, checkpointer
    
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
async def chat_endpoint(
    message: str,
    thread_id: Optional[str] = None,
    file_upload: Optional[UploadFile] = File(None),
):
    """Main agentic entry point"""
    global graph
    
    if not graph:
        raise HTTPException(503, "Service initializing, please retry")
    
    # Generate thread_id if new conversation
    is_new_thread = thread_id is None
    if is_new_thread:
        thread_id = f"loan_{uuid.uuid4().hex[:12]}"
    
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # Handle file upload (resume from interrupt)
        if file_upload:
            return await _handle_file_upload(thread_id, file_upload, config)
        
        # Handle new message
        return await _handle_message(thread_id, message, config, is_new_thread)
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
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


async def _handle_file_upload(
    thread_id: str,
    file_upload: UploadFile,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """Handle document upload and resume workflow"""
    
    # Validate file
    allowed_types = ["application/pdf", "image/jpeg", "image/png"]
    if file_upload.content_type not in allowed_types:
        raise HTTPException(400, f"Invalid file type: {file_upload.content_type}")
    
    # Save file (simple version - implement proper storage in production)
    import aiofiles
    from pathlib import Path
    
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    
    safe_filename = f"{thread_id}_{file_upload.filename}"
    file_path = upload_dir / safe_filename
    
    content = await file_upload.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    # Resume graph with file path
    final_state = None
    async for event in graph.astream(
        Command(resume={"file_path": str(file_path), "file_type": file_upload.content_type}),
        config,
        stream_mode="values"
    ):
        final_state = event
        
        if event.get("interrupt_signal"):
            return {
                "response": event["messages"][-1].content if event["messages"] else "",
                "requires_action": event["interrupt_signal"],
                "thread_id": thread_id,
                "status": "awaiting_input",
            }
    
    if final_state:
        return {
            "response": final_state["messages"][-1].content if final_state.get("messages") else "",
            "thread_id": thread_id,
            "status": final_state.get("application_status", "in_progress"),
            "document_received": file_upload.filename,
        }
    
    raise HTTPException(500, "No state returned after file processing")


@app.post("/chat/stream")
async def chat_stream_endpoint(
    message: str,
    thread_id: Optional[str] = None,
):
    """
    Streaming endpoint for real-time agent responses.
    Uses SSE (Server-Sent Events) for token-by-token delivery.
    """
    global graph
    
    if not graph:
        raise HTTPException(503, "Service initializing")
    
    if not thread_id:
        thread_id = f"loan_{uuid.uuid4().hex[:12]}"
    
    config = {"configurable": {"thread_id": thread_id}}
    
    async def event_generator() -> AsyncIterator[str]:
        """Generate SSE events"""
        
        # Send thread ID first
        yield f"data: {json.dumps({'type': 'thread_id', 'thread_id': thread_id})}\n\n"
        
        try:
            async for event in graph.astream_events(
                {"messages": [HumanMessage(content=message)]},
                config,
                version="v1"
            ):
                # Stream LLM tokens
                if event["event"] == "on_chat_model_stream":
                    token = event["data"]["chunk"].content
                    if token:
                        yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                
                # Stream tool calls
                elif event["event"] == "on_tool_start":
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': event['name']})}\n\n"
                
                elif event["event"] == "on_tool_end":
                    yield f"data: {json.dumps({'type': 'tool_end', 'tool': event['name']})}\n\n"
            
            # Final state
            final_state = await checkpointer.aget(config)
            if final_state:
                yield f"data: {json.dumps({'type': 'complete', 'status': final_state.get('application_status')})}\n\n"
            
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
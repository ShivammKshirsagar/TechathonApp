import asyncio
import json
import secrets

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.agents.master_agent import MasterAgent
from app.services.session_store import get_session


router = APIRouter()
master_agent = MasterAgent()


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    device_id: str | None = None
    ip_address: str | None = None


def _chunk_text(text: str, chunk_size: int = 16):
    buffer = ""
    for word in text.split(" "):
        if buffer:
            buffer += " "
        buffer += word
        if len(buffer) >= chunk_size:
            yield buffer
            buffer = ""
    if buffer:
        yield buffer


@router.post("/chat")
async def chat(request: ChatRequest):
    session_id = request.session_id or secrets.token_hex(8)
    session = get_session(session_id)
    response = master_agent.handle_message(
        session,
        request.message,
        device_id=request.device_id,
        ip_address=request.ip_address,
    )
    return {"message": response.text, "meta": response.meta, "session_id": session_id}


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    session_id = request.session_id or secrets.token_hex(8)
    session = get_session(session_id)
    response = master_agent.handle_message(
        session,
        request.message,
        device_id=request.device_id,
        ip_address=request.ip_address,
    )

    async def event_stream():
        for chunk in _chunk_text(response.text):
            payload = json.dumps({"type": "token", "value": chunk})
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.01)
        meta_payload = json.dumps({"type": "meta", "value": response.meta})
        yield f"data: {meta_payload}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

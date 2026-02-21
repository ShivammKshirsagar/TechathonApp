from fastapi import APIRouter, HTTPException


router = APIRouter()


@router.post("/chat")
async def chat_deprecated():
    raise HTTPException(
        status_code=410,
        detail="Legacy SessionState chat API is retired. Use backend/app/main.py endpoints (/chat, /chat/stream).",
    )


@router.post("/chat/stream")
async def chat_stream_deprecated():
    raise HTTPException(
        status_code=410,
        detail="Legacy SessionState chat stream API is retired. Use backend/app/main.py endpoint /chat/stream.",
    )

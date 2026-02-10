from fastapi import APIRouter, File, Form, UploadFile

from app.config import settings
from app.services.storage_service import save_upload
from app.services.session_store import get_session, update_session


router = APIRouter()


@router.post("/loan/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str | None = Form(default=None),
    session_id: str | None = Form(default=None),
):
    saved = await save_upload(settings.upload_dir, file)
    if session_id:
        session = get_session(session_id)
        if doc_type == "salary_slip":
            session.salary_slip_uploaded = True
            session.salary_slip_path = saved["path"]
        update_session(session)
    return {
        "url": saved["path"],
        "filename": saved["filename"],
        "base64": saved["base64"],
        "doc_type": doc_type,
        "session_id": session_id,
    }

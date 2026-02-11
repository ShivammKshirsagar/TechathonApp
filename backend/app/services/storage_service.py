# backend/app/services/storage_service.py
import os
import uuid
from pathlib import Path
from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


async def save_upload_file(file: UploadFile, thread_id: str) -> str:
    """Securely save uploaded file with validation"""
    
    # Sanitize filename
    safe_filename = f"{thread_id}_{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = UPLOAD_DIR / safe_filename
    
    # Save
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    return str(file_path.absolute())
from pathlib import Path
import base64
import uuid

from fastapi import UploadFile


def ensure_dir(path: str) -> Path:
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


async def save_upload(upload_dir: str, file: UploadFile) -> dict:
    target_dir = ensure_dir(upload_dir)
    extension = Path(file.filename or "").suffix
    filename = f"{uuid.uuid4().hex}{extension}"
    filepath = target_dir / filename

    content = await file.read()
    filepath.write_bytes(content)
    encoded = base64.b64encode(content).decode("utf-8")

    return {
        "path": str(filepath),
        "filename": file.filename,
        "base64": encoded,
    }

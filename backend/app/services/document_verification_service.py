from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

from app.settings import settings

PAN_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
AADHAAR_RE = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")


def _extract_pdf_text(file_path: str) -> str:
    # Guard against mislabeled files (e.g., image bytes with .pdf extension).
    try:
        with open(file_path, "rb") as f:
            header = f.read(5)
        if header != b"%PDF-":
            return ""
    except Exception:
        return ""
    try:
        from pypdf import PdfReader  # optional dependency

        reader = PdfReader(file_path)
        texts = []
        for page in reader.pages:
            texts.append(page.extract_text() or "")
        return "\n".join(texts)
    except Exception:
        return ""


def _normalize_aadhaar(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", "", value)


def verify_uploaded_document(
    *,
    doc_type: str,
    file_path: str,
    filename: str,
    content_type: Optional[str],
    pan: Optional[str],
    aadhaar: Optional[str],
) -> Dict[str, Any]:
    """Basic doc verification checks for demo: presence + identity consistency."""
    exists = os.path.exists(file_path) and os.path.getsize(file_path) > 0
    result: Dict[str, Any] = {
        "verified": False,
        "checks": [],
        "reason": None,
    }
    if not exists:
        result["reason"] = "File missing or empty."
        return result

    result["checks"].append("file_present")

    text = ""
    if (content_type or "").lower() == "application/pdf" or Path(filename).suffix.lower() == ".pdf":
        text = _extract_pdf_text(file_path).upper()

    file_upper = filename.upper()
    expected_pan = (pan or "").upper().strip()
    expected_aadhaar = _normalize_aadhaar(aadhaar)

    if doc_type in {"salary_slip", "bank_statement"}:
        result["verified"] = True
        result["checks"].append("basic_document_uploaded")
        return result

    if doc_type == "address_proof":
        if not settings.strict_document_verification:
            result["verified"] = True
            result["checks"].append("address_proof_uploaded_demo_mode")
            result["manual_review_note"] = "Strict identity text match disabled in demo mode."
            return result
        aadhaar_matches = {re.sub(r"\s+", "", m) for m in AADHAAR_RE.findall(text)}
        if expected_aadhaar and expected_aadhaar in aadhaar_matches:
            result["verified"] = True
            result["checks"].append("aadhaar_match_pdf")
            return result
        if expected_aadhaar and expected_aadhaar[-4:] and expected_aadhaar[-4:] in file_upper:
            result["verified"] = True
            result["checks"].append("aadhaar_match_filename_tail")
            return result
        result["reason"] = "Address proof does not match provided Aadhaar."
        return result

    if doc_type == "selfie_pan":
        if not settings.strict_document_verification:
            result["verified"] = True
            result["checks"].append("selfie_pan_uploaded_demo_mode")
            result["manual_review_note"] = "Strict PAN/OCR match disabled in demo mode."
            return result
        pans = set(PAN_RE.findall(text))
        if expected_pan and expected_pan in pans:
            result["verified"] = True
            result["checks"].append("pan_match_pdf")
            return result
        if expected_pan and expected_pan in file_upper:
            result["verified"] = True
            result["checks"].append("pan_match_filename")
            return result
        # For image selfies without OCR, keep a soft-pass marker for demo.
        if (content_type or "").lower().startswith("image/") and expected_pan:
            result["verified"] = True
            result["checks"].append("selfie_image_uploaded_manual_review")
            result["manual_review_note"] = "Image OCR unavailable; accepted for demo."
            return result
        result["reason"] = "Selfie PAN could not be verified against PAN."
        return result

    result["verified"] = True
    result["checks"].append("unknown_doc_type_accepted")
    return result

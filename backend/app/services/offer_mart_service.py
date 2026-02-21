from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional


DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "mock_customers.json"


def _load_customers() -> List[Dict[str, Any]]:
    with DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_mock_customers() -> List[Dict[str, Any]]:
    return _load_customers()


def get_offer_mart() -> List[Dict[str, Any]]:
    offers: List[Dict[str, Any]] = []
    for c in _load_customers():
        offers.append(
            {
                "customer_id": c["customer_id"],
                "name": c["name"],
                "phone": c["phone"],
                "pan": c["pan"],
                "city": c["city"],
                "credit_score": c["credit_score"],
                "preapproved_limit": c["preapproved_personal_loan_limit"],
            }
        )
    return offers


def find_customer_offer(
    *,
    pan: Optional[str] = None,
    phone: Optional[str] = None,
    customer_name: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    pan_norm = (pan or "").strip().upper()
    phone_norm = (phone or "").strip()
    name_norm = (customer_name or "").strip().lower()

    for offer in get_offer_mart():
        if pan_norm and offer["pan"].upper() == pan_norm:
            return offer
        if phone_norm and offer["phone"] == phone_norm:
            return offer
        if name_norm and offer["name"].lower() == name_norm:
            return offer
    return None

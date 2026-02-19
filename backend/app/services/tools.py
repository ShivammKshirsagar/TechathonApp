from __future__ import annotations

import json
from typing import Optional

from langchain_core.tools import tool

from app.services.credit_bureau import fetch_credit_score
from app.services.crm_service import verify_kyc
from app.services.fraud_service import analyze_fraud


@tool
async def calculate_emi(principal: float, tenure_months: int, interest_rate: float = 12.5) -> str:
    """Calculate EMI and total interest."""
    r = interest_rate / (12 * 100)
    emi = (principal * r * (1 + r) ** tenure_months) / ((1 + r) ** tenure_months - 1)
    total_payment = emi * tenure_months
    total_interest = total_payment - principal

    return json.dumps(
        {
            "emi": round(emi, 2),
            "total_interest": round(total_interest, 2),
            "total_payment": round(total_payment, 2),
            "affordability_check": "Calculate EMI/monthly_income to check affordability",
        }
    )


@tool
async def analyze_purpose(purpose: str) -> str:
    """Categorize loan purpose and assess risk profile."""
    purpose_lower = purpose.lower()

    categories = {
        "debt_consolidation": {"risk": "low", "urgency": "high", "typical_tenure": 36},
        "medical": {"risk": "medium", "urgency": "critical", "typical_tenure": 12},
        "wedding": {"risk": "medium", "urgency": "high", "typical_tenure": 24},
        "education": {"risk": "low", "urgency": "medium", "typical_tenure": 60},
        "business": {"risk": "high", "urgency": "medium", "typical_tenure": 48},
        "home_renovation": {"risk": "low", "urgency": "low", "typical_tenure": 84},
    }

    for keyword, profile in categories.items():
        if keyword.replace("_", " ") in purpose_lower or keyword in purpose_lower:
            return json.dumps(
                {
                    "category": keyword,
                    "risk_profile": profile["risk"],
                    "urgency": profile["urgency"],
                    "suggested_tenure": profile["typical_tenure"],
                    "reasoning": f"Detected {keyword} purpose",
                }
            )

    return json.dumps(
        {
            "category": "other",
            "risk_profile": "medium",
            "urgency": "medium",
            "suggested_tenure": 36,
            "reasoning": "General purpose loan",
        }
    )


@tool
async def check_affordability(monthly_income: float, existing_emis: float, proposed_emi: float) -> str:
    """Check if loan is affordable using FOIR."""
    total_obligations = existing_emis + proposed_emi
    foir = (total_obligations / monthly_income) * 100

    status = (
        "comfortable"
        if foir < 30
        else "stretched"
        if foir < 50
        else "risky"
        if foir < 60
        else "rejected"
    )

    return json.dumps(
        {
            "foir_percentage": round(foir, 2),
            "status": status,
            "max_recommended_emi": round(monthly_income * 0.5, 2),
            "available_for_new_emi": round(monthly_income * 0.5 - existing_emis, 2),
            "recommendation": "Proceed" if status in ["comfortable", "stretched"] else "Reduce amount or tenure",
        }
    )


@tool
async def fetch_credit_score_tool(pan: Optional[str], aadhaar: Optional[str], monthly_income: Optional[float]) -> str:
    """Fetch credit score (mock)."""
    score = fetch_credit_score(pan, aadhaar, monthly_income)
    return json.dumps({"credit_score": score})


@tool
async def verify_kyc_tool(phone: Optional[str], address: Optional[str]) -> str:
    """Verify KYC via CRM (mock)."""
    result = verify_kyc(phone or "", address or "")
    return json.dumps(result)


@tool
async def analyze_fraud_tool(
    user_id: Optional[str], device_id: Optional[str], ip_address: Optional[str], phone: Optional[str]
) -> str:
    """Analyze fraud signals (mock/neo4j)."""
    result = analyze_fraud(user_id=user_id, device_id=device_id, ip_address=ip_address, phone=phone)
    return json.dumps(result)

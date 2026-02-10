from fastapi import APIRouter
from pydantic import BaseModel

from app.services.credit_service import evaluate_credit


router = APIRouter()


class VerifyOtpRequest(BaseModel):
    otp: str


@router.post("/loan/verify-otp")
async def verify_otp(request: VerifyOtpRequest):
    return {"valid": request.otp.isdigit() and len(request.otp) == 6}


class CreditEvaluateRequest(BaseModel):
    pan: str
    aadhaar: str
    monthly_income: float


@router.post("/loan/credit-evaluate")
async def credit_evaluate(request: CreditEvaluateRequest):
    return evaluate_credit(request.pan, request.aadhaar, request.monthly_income)


class ApprovalRequest(BaseModel):
    session_id: str | None = None


@router.post("/loan/process-approval")
async def process_approval(_: ApprovalRequest):
    return {"status": "approved"}

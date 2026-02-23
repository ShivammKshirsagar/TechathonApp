# CodeBlitz Backend

## Setup
1. Create a virtualenv and install dependencies:
```bash
py -3.11 -m venv .venv  
.\.venv\Scripts\activate
pip install -r backend/requirements.txt
```

2. Run the API:
```bash
uvicorn app.main:app --reload --reload-dir backend --port 8000 --app-dir backend
```

## Endpoints
- `GET /health`
- `POST /chat` (basic agent response)
- `POST /chat/stream` (SSE streaming)
- `POST /loan/verify-otp`
- `POST /loan/credit-evaluate`
- `POST /loan/process-approval`
- `POST /loan/upload` (multipart form)
- `GET /mock/customers` (synthetic customer dataset for demo)
- `GET /mock/offers` (offer-mart pre-approved limits)

## Underwriting Policy (Hackathon PS)
- Reject if credit score `< 700`
- Approve instantly if `requested_amount <= preapproved_limit`
- If `requested_amount <= 2 x preapproved_limit`: request `salary_slip` and approve only if `EMI <= 50%` of monthly salary
- Reject if `requested_amount > 2 x preapproved_limit`
- Additional verification guard (demo realism): salary slip is required before any final approval is issued.
- KYC/verification guard: final approval requires `salary_slip`, `bank_statement`, `address_proof`, and `selfie_pan` uploaded and marked verified.
- PDF verification uses basic text extraction (`pypdf`) to match PAN/Aadhaar where applicable.

## Security
Optional debug-state protection:
```
STATE_DEBUG_TOKEN=your_admin_token
```
If set, `/state/{thread_id}` requires header `x-admin-token` with this value.

## Neo4j (optional)
Set environment variables to enable fraud checks:
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## LLM Configuration
The agentic flow requires an OpenAI-compatible chat API:
```
LLM_API_KEY=your_api_key
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com
LLM_TIMEOUT_S=30
```
You can also set `OPENAI_API_KEY` instead of `LLM_API_KEY`.

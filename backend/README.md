# CodeBlitz Backend

## Setup
1. Create a virtualenv and install dependencies:
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend/requirements.txt
```

2. Run the API:
```bash
uvicorn app.main:app --reload --port 8000 --app-dir backend
```

## Endpoints
- `GET /health`
- `POST /chat` (basic agent response)
- `POST /chat/stream` (SSE streaming)
- `POST /loan/verify-otp`
- `POST /loan/credit-evaluate`
- `POST /loan/process-approval`
- `POST /loan/upload` (multipart form)

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

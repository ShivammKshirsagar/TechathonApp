# Loan Application

AI-powered loan application system built with Next.js, TypeScript, and Tailwind CSS.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the backend (new):
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn app.main:app --reload --reload-dir backend --port 8000 --app-dir backend
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `/app` - Next.js app router pages
- `/components` - React components organized by feature
- `/styles` - Global styles and Tailwind configuration
- `/providers` - Context providers (Theme, etc.)
- `/backend` - FastAPI + LangGraph backend

## Features

- Chat-based loan application interface
- Agent-driven conversation flow
- KYC verification
- Underwriting decision engine
- Salary slip upload and eligibility check
- Sanction letter generation
- Dark mode support


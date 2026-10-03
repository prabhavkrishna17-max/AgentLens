# AgentLens

AgentLens is a purpose-built observability and diagnostic platform for AI agents. Its core mission is to answer one question: **"Why did my AI agent fail?"**

Instead of a generic SaaS monitoring dashboard, AgentLens provides an interactive, developer-focused workbench for:
- **Observing** agent execution in real-time.
- **Tracing** every execution step, tool call, and LLM generation.
- **Identifying** exactly where and why failures occur.
- **Diagnosing** failures using the observed evidence context.
- **Refining** prompts dynamically within the integrated Prompt Lab.
- **Comparing** executions side-by-side to understand if changes actually improved the agent.

## Architecture

- **Frontend**: React + Vite SPA, styled with Tailwind CSS and `shadcn/ui`.
- **Backend**: Python + FastAPI, SQLAlchemy (SQLite by default).
- **SDK**: A robust Python SDK (`agentlens_sdk`) for instrumenting agents.

## Local Development Setup

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
# Install the SDK locally
pip install -e .

# Run the API server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

### 3. Environment Variables
Copy the `.env.example` files:
- `frontend/.env.example` -> `frontend/.env`
- `backend/.env.example` -> `backend/.env`

For local development, no specific configuration is strictly required, as the defaults are designed for `localhost`.

## Testing & Verification

Run the unified verification script to ensure everything works end-to-end:
```bash
# Windows
scripts\verify.bat

# macOS/Linux
./scripts/verify.sh
```
This runs `pytest`, the frontend build, and a comprehensive end-to-end smoke test.

## Connecting an Agent

AgentLens provides an SDK that instruments your existing agents with just a few lines of code.

```python
from agentlens_sdk import AgentLens

lens = AgentLens(
    api_key="YOUR_PROJECT_API_KEY",
    base_url="http://localhost:8000" # Use deployed URL in production
)

with lens.run(agent_name="SupportAgent", task="Refund Request"):
    with lens.tool("LookupOrder"):
        # your tool code here
        pass
```

We provide native, opt-in monkey-patching for major providers like OpenAI, Anthropic (Claude), and Google Gemini. See the **Integration Center** in the app for exact snippets.

## Provider Integrations
- **OpenAI**: `instrument_openai(lens)`
- **Claude**: `instrument_anthropic(lens)`
- **Gemini**: `instrument_gemini(lens)`
- **Generic**: Use `run.llm()` and `run.tool()` contexts manually.

## Deployment Architecture
For production deployments, please refer to [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The recommended architecture is Cloudflare Pages for the frontend and a standard container platform (e.g., Render, Railway, Cloud Run) for the backend.

## Current Limitations
- **Local Read Access**: By default, dashboard GET APIs (`/api/runs`) do not enforce API-key auth to allow frictionless local development. SDK ingestion routes *are* strictly authenticated.
- **Payload Truncation**: The SDK automatically redacts sensitive keys and truncates giant payloads (>10,000 chars) to prevent performance degradation and accidental secret leakage.
- **Cloudflare Workers**: The backend uses SQLAlchemy and SQLite, which rely on C-extensions and persistent filesystems not supported by Cloudflare Workers (Pyodide).

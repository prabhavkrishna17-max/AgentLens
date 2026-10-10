# AgentLens

> **Observability, Tracing & Failure-Diagnosis Workbench for Autonomous AI Agents.**  
> *"Why did my AI agent fail?"* — Trace multi-step reasoning chains, inspect tool calls in real time, classify execution failures, and refine prompts in a unified developer workspace.

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.2-61DAFB.svg?logo=react&logoColor=0A0F1D)](https://react.dev/)
[![ReactFlow](https://img.shields.io/badge/Graph-ReactFlow_11-FF0072.svg)](https://reactflow.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Ready-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Project Overview & Value Proposition

When autonomous AI agents enter complex loops, execute tool calls, and produce non-deterministic outputs, standard application logging falls short. Logs become an unreadable wall of text, and pinpointing which tool failed, what context was injected, or why a model hallucinated is painful and slow.

**AgentLens** is a purpose-built developer workbench designed specifically for AI agent execution. It captures high-resolution telemetry, builds an interactive directed acyclic graph (DAG) of the execution trace, isolates failure points, provides automated diagnostic suggestions, and allows instant prompt refinement in an integrated Prompt Lab.

---

## 2. Project Status

- **Status:** Production-Ready Working Prototype / Developer Workbench.
- **Current Branch:** `master`.
- **SDK Package:** `agentlens_sdk` (Python drop-in instrumentation).

---

## 3. The Problem: Silent Agent Failures

AI agents fail in distinct, non-traditional ways:
1. **Tool Invocation Errors:** Malformed JSON parameters, unhandled timeouts, or missing schema arguments.
2. **Infinite Reasoning Loops:** Agents cycling between identical actions without reaching termination criteria.
3. **Context Hallucination:** Models inventing facts when upstream tool payloads are incomplete or truncated.
4. **Latency Bottlenecks:** Opaque tool execution delays obscured by overall generation time.

---

## 4. The Solution

AgentLens provides an end-to-end telemetry harness:
- **Drop-In SDK:** Instrument any Python agent in 2 lines of code.
- **Execution Graph DAG:** Interactive ReactFlow + Dagre node visualization showing parent-child dependencies, step latencies, and payload schemas.
- **Automated Failure Analysis:** Rule-based heuristics and optional LLM-assisted diagnosis explaining the root cause of failed runs.
- **Side-by-Side Execution Diffing:** Compare runs across different model providers, temperature settings, and prompt iterations.

---

## 5. Architectural Flow

```
┌────────────────────────────────────────────────────────┐
│ Autonomous Agent (LangChain, CrewAI, Custom Agent, etc.)│
└───────────────────────────┬────────────────────────────┘
                            │
              agentlens_sdk (Telemetry Hooks)
                            │ HTTP POST /api/runs, /api/spans
                            ▼
       ┌────────────────────────────────────────┐
       │     AgentLens FastAPI Backend Server   │
       │     • Ingestion API                    │
       │     • Connection Pooling (PostgreSQL)  │
       │     • SQLite Local Fallback            │
       │     • Diagnostic Assistant             │
       └────────────────────┬───────────────────┘
                            │
                            ▼
       ┌────────────────────────────────────────┐
       │     AgentLens Developer Frontend       │
       │     • ReactFlow Interactive DAG        │
       │     • Live Telemetry Stream            │
       │     • Step Inspector & JSON Payloads   │
       │     • Prompt Lab & Execution Compare   │
       └────────────────────────────────────────┘
```

---

## 6. Implemented Features

- **Execution Graph Visualization:** Interactive node canvas powered by `ReactFlow` and `Dagre`, rendering agent decisions, tool steps, and LLM completions with color-coded status badges.
- **Drop-In Python SDK (`agentlens_sdk`):** Minimal instrumentation decorator and context managers supporting OpenAI, Anthropic Claude, Google Gemini, and generic function tools.
- **Payload Redaction & Truncation:** Automatic redaction of sensitive tokens/keys and safe truncation of oversized payloads (>10,000 chars) to prevent secret leakage and UI lag.
- **Multi-Database Support:** Seamless switching between lightweight local SQLite and enterprise PostgreSQL with SQLAlchemy 2.0 connection pooling.
- **Diagnostic Assistant:** Automatic detection of tool timeouts, invalid schema mutations, and prompt anomalies.
- **Prompt Lab:** In-workbench editor to test adjusted prompts directly against captured execution contexts.

---

## 7. Technology Stack

### Backend & SDK
- **Language:** Python 3.10+
- **Framework:** FastAPI (`>=0.100.0`), Uvicorn (`>=0.23.0`)
- **Database & ORM:** SQLAlchemy (`>=2.0.0`), Alembic (`>=1.11.0`), SQLite, PostgreSQL (`psycopg2`)
- **Validation:** Pydantic v2 (`>=2.0.0`)
- **LLM Assistance:** `google-genai`

### Frontend
- **Framework:** React 19 (`19.2.8`), Vite (`8.2.0`), TypeScript (`~6.0.2`)
- **Graph & Visualization:** ReactFlow (`^11.11.4`), Dagre (`^0.8.5`), OGL (`^1.0.11`)
- **State & Data Fetching:** Zustand (`^5.0.15`), TanStack React Query (`^5.101.4`)
- **UI & Motion:** Tailwind CSS, Framer Motion (`^13.1.0`), GSAP (`^3.15.0`), Lucide React

---

## 8. Repository Structure

```text
AgentLens/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route handlers (runs, spans, diagnosis, projects)
│   │   ├── core/            # Database engine, connection pooling, settings
│   │   ├── models/          # SQLAlchemy database models
│   │   └── schemas/         # Pydantic request/response schemas
│   ├── agentlens_sdk/       # Pip-installable client instrumentation library
│   ├── alembic/             # Database migration versions
│   ├── requirements.txt     # Backend dependencies
│   └── setup.py             # SDK package setup
├── frontend/
│   ├── src/
│   │   ├── components/      # ReactFlow nodes, trace inspector, timeline, header
│   │   ├── pages/           # Runs overview, Run Detail, Prompt Lab, Compare view
│   │   ├── stores/          # Zustand state stores
│   │   └── api/             # React Query API fetchers
│   ├── package.json
│   └── vite.config.ts
├── docs/                    # Architecture, deployment, and SDK documentation
├── scripts/                 # Verification and test automation scripts
│   ├── verify.bat           # Windows verification script
│   └── verify.sh            # Unix verification script
└── README.md
```

---

## 9. Prerequisites

- Python 3.10 or higher
- Node.js 18.x or higher
- Git

---

## 10. Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/prabhavkrishna17-max/AgentLens.git
cd AgentLens
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows PowerShell
venv\Scripts\Activate.ps1
# macOS / Linux
source venv/bin/activate

# Install requirements and SDK in editable mode
pip install -r requirements.txt
pip install -e .
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Environment Configuration
Copy environment templates:
```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```

Default configuration works out-of-the-box for local SQLite. For PostgreSQL:
```ini
DATABASE_URL=postgresql://user:password@localhost:5432/agentlens
```

---

## 11. Running the Platform

### Start Backend Server
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```
Server runs at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

### Start Frontend Workspace
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 12. Instrumenting an Agent with the SDK

Install the SDK or reference the local package:

```python
from agentlens_sdk import AgentLens

# Initialize client
lens = AgentLens(
    api_key="default-dev-key",
    base_url="http://localhost:8000"
)

# Instrument an agent execution run
with lens.run(agent_name="ResearchAgent", task="Summarize Financial Disclosures") as run:
    # Track model call
    with run.step(name="ModelReasoning", step_type="llm") as step:
        step.log_input({"prompt": "Extract EBITDA margins for FY25"})
        # ... LLM invocation ...
        step.log_output({"response": "EBITDA margins increased by 4.2%"})
        
    # Track tool execution
    with run.step(name="VerifySECFilings", step_type="tool") as tool_step:
        tool_step.log_input({"ticker": "AAPL", "form": "10-K"})
        # ... Tool invocation ...
        tool_step.log_output({"verified": True, "source": "sec.gov"})
```

---

## 13. Testing & Verification

Run the unified test harness:

```bash
# Windows
scripts\verify.bat

# macOS / Linux
chmod +x scripts/verify.sh
./scripts/verify.sh
```

Or run individual suites:
```bash
# Backend unit tests
pytest

# Frontend build verification
cd frontend && npm run build
```

---

## 14. Known Limitations

- **Local Read Access:** GET routes (`/api/runs`) do not require authentication by default to accelerate local developer workflows. SDK ingestion endpoints require API keys.
- **Large Payload Truncation:** Extremely large payloads (>10,000 characters) are truncated by the SDK to safeguard developer network bandwidth and UI rendering speeds.
- **Cloudflare Workers:** The Python backend requires persistent filesystem or standard PostgreSQL drivers and cannot run directly in Pyodide/Worker runtimes.

---

## 15. Contributor Credits

- **Prabhav Krishna R** ([@prabhavkrishna17-max](https://github.com/prabhavkrishna17-max)) — System architecture, FastAPI backend, drop-in Python SDK, and ReactFlow execution graph UI.

---

## 16. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

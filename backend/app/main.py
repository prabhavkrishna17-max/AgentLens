from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
load_dotenv()

from .api import runs, steps, diagnosis, projects, ingest, analytics, search, prompt, agent

app = FastAPI(
    title="AgentLens API",
    description="Backend API for the AgentLens Observability Platform",
    version="1.0.0"
)

# Allow frontend requests
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router, prefix="/api/v1/ingest", tags=["Ingest"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(runs.router, prefix="/api/runs", tags=["Runs"])
app.include_router(steps.router, prefix="/api/steps", tags=["Steps"])
app.include_router(diagnosis.router, tags=["Diagnosis"])
app.include_router(prompt.router, prefix="/api", tags=["Prompts"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(agent.router, tags=["Agent"])

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "agentlens-api"}

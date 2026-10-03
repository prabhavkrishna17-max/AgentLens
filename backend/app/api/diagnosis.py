from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..core.db import get_db
from ..models import AgentRun, ExecutionStep, Diagnosis, Project
from ..services.diagnosis.engine import DiagnosisEngine

router = APIRouter()

@router.post("/api/v1/projects/{project_id}/runs/{run_id}/diagnose")
def diagnose_run(project_id: str, run_id: str, db: Session = Depends(get_db)):
    """Triggers an AI diagnosis for a failed run."""
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.project_id == project_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found in this project")
        
    if run.status != "failed":
        raise HTTPException(status_code=400, detail="Can only diagnose failed runs")
        
    # Check if diagnosis already exists
    existing_diagnosis = db.query(Diagnosis).filter(Diagnosis.run_id == run_id).first()
    if existing_diagnosis:
        return {"status": "success", "message": "Diagnosis already exists", "diagnosis": _format_diagnosis(existing_diagnosis)}

    # Fetch full trace context
    all_steps = db.query(ExecutionStep).filter(ExecutionStep.run_id == run_id).order_by(ExecutionStep.started_at.asc()).all()
    failed_steps = [s for s in all_steps if s.status == "failed"]
    
    if not failed_steps:
        raise HTTPException(status_code=400, detail="Run is marked as failed but no failed steps found")
        
    failed_step = failed_steps[-1] # Usually the last failed step is the root cause
    
    # Initialize engine
    engine = DiagnosisEngine(db)
    diagnosis = engine.diagnose(run, all_steps, failed_step)
    
    return {"status": "success", "message": "Diagnosis generated", "diagnosis": _format_diagnosis(diagnosis)}

@router.get("/api/v1/projects/{project_id}/runs/{run_id}/diagnosis")
def get_diagnosis(project_id: str, run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.project_id == project_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found in this project")
        
    diagnosis = db.query(Diagnosis).filter(Diagnosis.run_id == run_id).first()
    if not diagnosis:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
        
    return _format_diagnosis(diagnosis)

def _format_diagnosis(diagnosis: Diagnosis):
    return {
        "id": diagnosis.id,
        "run_id": diagnosis.run_id,
        "step_id": diagnosis.step_id,
        "failure_category": diagnosis.failure_category,
        "root_cause": diagnosis.root_cause,
        "severity": diagnosis.severity,
        "confidence_score": diagnosis.confidence_score,
        "explanation": diagnosis.explanation,
        "evidence": diagnosis.evidence,
        "suggested_fixes": diagnosis.suggested_fixes,
        "prevention_tips": diagnosis.prevention_tips,
        "technical_details": diagnosis.technical_details,
        "created_at": diagnosis.created_at.isoformat() if diagnosis.created_at else None
    }

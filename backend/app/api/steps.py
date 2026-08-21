from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..core.db import get_db
from ..models import ExecutionStep, AgentRun

router = APIRouter()

@router.get("/run/{run_id}")
def get_steps_for_run(run_id: str, db: Session = Depends(get_db)):
    # Verify run exists
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    steps = db.query(ExecutionStep).filter(ExecutionStep.run_id == run_id).order_by(ExecutionStep.started_at.asc()).all()
    
    return [
        {
            "id": s.id,
            "run_id": s.run_id,
            "parent_id": s.parent_id,
            "type": s.step_type,
            "name": s.name,
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "duration": s.duration,
            "input": s.input,
            "output": s.output,
            "error": s.error,
            "metadata": s.metadata_json
        }
        for s in steps
    ]

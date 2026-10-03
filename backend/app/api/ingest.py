from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
import datetime

from app.core.db import get_db
from app.models.project import Project
from app.models.run import AgentRun
from app.models.step import ExecutionStep
from app.api.auth import get_current_project
from app.schemas.ingest import RunCreate, RunUpdate, StepCreate, StepUpdate

router = APIRouter()

@router.post("/runs", status_code=status.HTTP_201_CREATED)
def start_run(
    run_data: RunCreate,
    project: Project = Depends(get_current_project),
    db: Session = Depends(get_db)
):
    """Start a new run for the authenticated project."""
    run = AgentRun(
        project_id=project.id,
        environment=run_data.environment or project.environment,
        agent_name=run_data.agent_name,
        task=run_data.task,
        metadata_json=run_data.metadata,
        status="running"
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return {"id": run.id, "status": run.status}

@router.patch("/runs/{run_id}")
def update_run(
    run_id: str,
    update_data: RunUpdate,
    project: Project = Depends(get_current_project),
    db: Session = Depends(get_db)
):
    """Update a run's status/duration."""
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.project_id == project.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found or access denied")
        
    if update_data.status is not None:
        run.status = update_data.status
    if update_data.error is not None:
        run.error = update_data.error
    if update_data.completed_at is not None:
        try:
            # Simple ISO format parse
            run.completed_at = datetime.datetime.fromisoformat(update_data.completed_at.replace("Z", "+00:00"))
        except ValueError:
            pass # fallback to utcnow if we wanted, or ignore
    if update_data.duration is not None:
        run.duration = update_data.duration
        
    db.commit()
    return {"status": "ok"}


@router.post("/steps", status_code=status.HTTP_201_CREATED)
def start_step(
    step_data: StepCreate,
    project: Project = Depends(get_current_project),
    db: Session = Depends(get_db)
):
    """Start a new step within a run."""
    run_id = step_data.run_id
    # Verify run ownership
    run = db.query(AgentRun).filter(AgentRun.id == run_id, AgentRun.project_id == project.id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found or access denied")
        
    step = ExecutionStep(
        run_id=run.id,
        parent_id=step_data.parent_id,
        step_type=step_data.type,
        name=step_data.name,
        input=step_data.input if project.capture_inputs else None,
        status="executing",
        metadata_json=step_data.metadata
    )
    db.add(step)
    db.commit()
    db.refresh(step)
    return {"id": step.id}


@router.patch("/steps/{step_id}")
def update_step(
    step_id: str,
    update_data: StepUpdate,
    project: Project = Depends(get_current_project),
    db: Session = Depends(get_db)
):
    """Update a step (completion, failure, outputs)."""
    # Join to ensure the step belongs to a run owned by this project
    step = db.query(ExecutionStep).join(AgentRun).filter(
        ExecutionStep.id == step_id,
        AgentRun.project_id == project.id
    ).first()
    
    if not step:
        raise HTTPException(status_code=404, detail="Step not found or access denied")
        
    if update_data.status is not None:
        step.status = update_data.status
    if update_data.output is not None and project.capture_outputs:
        step.output = update_data.output
    if update_data.error is not None and getattr(project, 'capture_errors', True):
        step.error = update_data.error
    if update_data.duration is not None:
        step.duration = update_data.duration
    if update_data.completed_at is not None:
        try:
            step.completed_at = datetime.datetime.fromisoformat(update_data.completed_at.replace("Z", "+00:00"))
        except ValueError:
            pass

    db.commit()
    return {"status": "ok"}

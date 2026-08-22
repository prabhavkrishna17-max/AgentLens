from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from ..core.db import get_db
from ..models import AgentRun, ExecutionStep, Diagnosis

router = APIRouter()

@router.get("")
def list_runs(
    skip: int = 0, 
    limit: int = 100, 
    project_id: Optional[str] = None, 
    status: Optional[str] = None,
    agent: Optional[str] = None,
    environment: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: Optional[str] = "latest",
    db: Session = Depends(get_db)
):
    query = db.query(AgentRun)
    if project_id:
        query = query.filter(AgentRun.project_id == project_id)
    if status and status != 'all':
        query = query.filter(AgentRun.status == status)
    if agent and agent != 'all':
        query = query.filter(AgentRun.agent_name == agent)
    if environment and environment != 'all':
        query = query.filter(AgentRun.environment == environment)
        
    if start_date:
        from datetime import datetime
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            query = query.filter(AgentRun.started_at >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        from datetime import datetime
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query = query.filter(AgentRun.started_at <= end_dt)
        except ValueError:
            pass
            
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (AgentRun.task.ilike(search_term)) | 
            (AgentRun.agent_name.ilike(search_term)) |
            (AgentRun.id.ilike(search_term)) |
            (AgentRun.error.ilike(search_term))
        )
        
    total_count = query.count()
    
    if sort_by == "oldest":
        query = query.order_by(AgentRun.started_at.asc())
    elif sort_by == "duration":
        query = query.order_by(AgentRun.duration.desc())
    elif sort_by == "status":
        query = query.order_by(AgentRun.status.asc())
    else: # latest
        query = query.order_by(AgentRun.started_at.desc())
        
    runs = query.offset(skip).limit(limit).all()
    
    return {
        "items": [
            {
                "id": r.id,
                "agent_name": r.agent_name,
                "task": r.task,
                "status": r.status,
                "environment": r.environment,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
                "duration": r.duration,
                "metadata": r.metadata_json,
                "error": r.error
            }
            for r in runs
        ],
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@router.get("/{run_id}")
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return {
        "id": run.id,
        "project_id": run.project_id,
        "agent_name": run.agent_name,
        "task": run.task,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "duration": run.duration,
        "metadata": run.metadata_json,
        "error": run.error
    }



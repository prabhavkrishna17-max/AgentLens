from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any

from ..core.db import get_db
from ..models import AgentRun, Project

router = APIRouter()

@router.get("/")
def global_search(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return {"projects": [], "runs": []}
        
    query_str = f"%{q}%"
    
    # Search Projects
    projects = db.query(Project).filter(
        or_(
            Project.name.ilike(query_str),
            Project.description.ilike(query_str)
        )
    ).limit(5).all()
    
    # Search Runs
    runs = db.query(AgentRun).filter(
        or_(
            AgentRun.id.ilike(query_str),
            AgentRun.task.ilike(query_str)
        )
    ).limit(10).all()
    
    return {
        "projects": [
            {"id": p.id, "name": p.name, "type": "project"} for p in projects
        ],
        "runs": [
            {"id": r.id, "task": r.task, "status": r.status, "type": "run"} for r in runs
        ]
    }

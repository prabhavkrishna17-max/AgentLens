from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import datetime

from ..core.db import get_db
from ..models import PromptRefinement, Project

router = APIRouter()

class RefineRequest(BaseModel):
    project_id: str
    target_model: str
    original_prompt: str

class PromptRefinementResponse(BaseModel):
    id: str
    project_id: str
    target_model: str
    original_prompt: str
    refined_prompt: str
    changes: list
    quality_before: Optional[int]
    quality_after: Optional[int]
    created_at: Optional[str]

@router.post("/v1/prompts/refine")
def refine_prompt(req: RefineRequest, db: Session = Depends(get_db)):
    from ..services.prompt import get_strategy
    
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    strategy = get_strategy(req.target_model)
    result = strategy.refine(req.original_prompt)
    
    refinement = PromptRefinement(
        project_id=req.project_id,
        target_model=req.target_model,
        original_prompt=req.original_prompt,
        refined_prompt=result["refined_prompt"],
        changes=result["changes"],
        quality_before=result["quality_before"],
        quality_after=result["quality_after"]
    )
    
    db.add(refinement)
    db.commit()
    db.refresh(refinement)
    
    return _format_refinement(refinement)

@router.get("/v1/projects/{project_id}/prompts")
def get_prompts_for_project(project_id: str, db: Session = Depends(get_db)):
    prompts = db.query(PromptRefinement).filter(PromptRefinement.project_id == project_id).order_by(PromptRefinement.created_at.desc()).all()
    return [_format_refinement(p) for p in prompts]

@router.get("/v1/prompts/{id}")
def get_prompt(id: str, db: Session = Depends(get_db)):
    p = db.query(PromptRefinement).filter(PromptRefinement.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return _format_refinement(p)

@router.delete("/v1/prompts/{id}")
def delete_prompt(id: str, db: Session = Depends(get_db)):
    p = db.query(PromptRefinement).filter(PromptRefinement.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(p)
    db.commit()
    return {"status": "success"}

def _format_refinement(p: PromptRefinement):
    return {
        "id": p.id,
        "project_id": p.project_id,
        "target_model": p.target_model,
        "original_prompt": p.original_prompt,
        "refined_prompt": p.refined_prompt,
        "changes": p.changes,
        "quality_before": p.quality_before,
        "quality_after": p.quality_after,
        "created_at": p.created_at.isoformat() if p.created_at else None
    }

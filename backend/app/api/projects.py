from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.core.db import get_db
from app.models.project import Project, Workspace, ApiKey
from app.api.auth import generate_api_key

router = APIRouter()

def ensure_default_project(db: Session):
    """Ensures a default workspace and demo project exist with an initial API key."""
    workspace = db.query(Workspace).first()
    if not workspace:
        workspace = Workspace(name="Default Workspace")
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
    projects = db.query(Project).filter(Project.workspace_id == workspace.id).all()
    if not projects:
        project = Project(
            workspace_id=workspace.id,
            name="AgentLens Demo Project",
            description="Default production project for AgentLens",
            environment="production"
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        
        api_key, key_hash, prefix = generate_api_key()
        key_record = ApiKey(
            project_id=project.id,
            key_hash=key_hash,
            prefix=prefix
        )
        db.add(key_record)
        db.commit()
        projects = [project]
        
    return workspace, projects

@router.get("")
def get_projects(db: Session = Depends(get_db)):
    """Returns all projects. In a real app, this would be filtered by the logged-in user's workspace."""
    workspace, projects = ensure_default_project(db)
    return [{
        "id": p.id, 
        "name": p.name, 
        "description": p.description, 
        "environment": p.environment, 
        "capture_inputs": p.capture_inputs,
        "capture_outputs": p.capture_outputs,
        "capture_errors": p.capture_errors,
        "created_at": p.created_at
    } for p in projects]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(project_data: Dict[str, Any], db: Session = Depends(get_db)):
    """Creates a new project and returns it."""
    # Ensure a default workspace exists
    workspace = db.query(Workspace).first()
    if not workspace:
        workspace = Workspace(name="Default Workspace")
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        
    project = Project(
        workspace_id=workspace.id,
        name=project_data.get("name"),
        description=project_data.get("description", ""),
        environment=project_data.get("environment", "development")
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return {
        "id": project.id, 
        "name": project.name, 
        "description": project.description, 
        "environment": project.environment,
        "capture_inputs": project.capture_inputs,
        "capture_outputs": project.capture_outputs,
        "capture_errors": project.capture_errors,
        "created_at": project.created_at
    }


@router.put("/{project_id}", status_code=status.HTTP_200_OK)
def update_project(project_id: str, project_data: Dict[str, Any], db: Session = Depends(get_db)):
    """Updates project settings."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    if "name" in project_data:
        project.name = project_data["name"]
    if "description" in project_data:
        project.description = project_data["description"]
    if "environment" in project_data:
        project.environment = project_data["environment"]
    if "capture_inputs" in project_data:
        project.capture_inputs = project_data["capture_inputs"]
    if "capture_outputs" in project_data:
        project.capture_outputs = project_data["capture_outputs"]
    if "capture_errors" in project_data:
        project.capture_errors = project_data["capture_errors"]
        
    db.commit()
    db.refresh(project)
    
    return {
        "id": project.id, 
        "name": project.name, 
        "description": project.description, 
        "environment": project.environment,
        "capture_inputs": project.capture_inputs,
        "capture_outputs": project.capture_outputs,
        "capture_errors": project.capture_errors,
        "created_at": project.created_at
    }

@router.post("/{project_id}/keys", status_code=status.HTTP_201_CREATED)
def generate_key_for_project(project_id: str, db: Session = Depends(get_db)):
    """Generates a new API key for the project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    api_key, key_hash, prefix = generate_api_key()
    
    key_record = ApiKey(
        project_id=project.id,
        key_hash=key_hash,
        prefix=prefix
    )
    db.add(key_record)
    db.commit()
    db.refresh(key_record)
    
    # Return the plaintext key ONLY ONCE.
    return {
        "id": key_record.id,
        "api_key": api_key,
        "prefix": prefix,
        "created_at": key_record.created_at
    }


@router.get("/{project_id}/keys")
def get_project_keys(project_id: str, db: Session = Depends(get_db)):
    """Returns a list of API keys for the project (without secrets)."""
    keys = db.query(ApiKey).filter(ApiKey.project_id == project_id, ApiKey.revoked == False).all()
    return [{"id": k.id, "prefix": k.prefix, "created_at": k.created_at} for k in keys]


@router.delete("/{project_id}/keys/{key_id}")
def revoke_api_key(project_id: str, key_id: str, db: Session = Depends(get_db)):
    """Revokes an API key."""
    key = db.query(ApiKey).filter(ApiKey.id == key_id, ApiKey.project_id == project_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
        
    import datetime
    key.revoked = True
    key.revoked_at = datetime.datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db)):
    """Deletes a project and all its data."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    db.commit()
    return {"status": "ok"}

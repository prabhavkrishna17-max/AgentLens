from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class RunCreate(BaseModel):
    environment: Optional[str] = Field(default="development", max_length=100)
    agent_name: Optional[str] = Field(default="Unknown Agent", max_length=255)
    task: Optional[str] = Field(default="Unnamed Task", max_length=5000)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class RunUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=50)
    error: Optional[Dict[str, Any]] = None
    completed_at: Optional[str] = Field(None, max_length=50)
    duration: Optional[float] = None

class StepCreate(BaseModel):
    run_id: str = Field(..., max_length=100)
    parent_id: Optional[str] = Field(None, max_length=100)
    type: Optional[str] = Field(default="Unknown", max_length=100)
    name: Optional[str] = Field(default="Unnamed Step", max_length=1000)
    input: Optional[Any] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class StepUpdate(BaseModel):
    status: Optional[str] = Field(None, max_length=50)
    output: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    duration: Optional[float] = None
    completed_at: Optional[str] = Field(None, max_length=50)

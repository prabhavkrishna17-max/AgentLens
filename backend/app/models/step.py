from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
import datetime
import uuid

from .base import Base

def generate_uuid():
    return str(uuid.uuid4())

class ExecutionStep(Base):
    __tablename__ = "steps"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("runs.id"), nullable=False, index=True)
    parent_id = Column(String, ForeignKey("steps.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    step_type = Column(String, nullable=False) # e.g., Planner, Reasoning, Tool, API
    status = Column(String, nullable=False, default="executing") # executing, success, failed
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration = Column(Float, nullable=True)
    
    input = Column(JSON, nullable=True)
    output = Column(JSON, nullable=True)
    error = Column(JSON, nullable=True)
    metadata_json = Column(JSON, nullable=True)

    run = relationship("AgentRun", back_populates="steps")
    children = relationship("ExecutionStep", back_populates="parent", cascade="all, delete-orphan")
    parent = relationship("ExecutionStep", back_populates="children", remote_side=[id])

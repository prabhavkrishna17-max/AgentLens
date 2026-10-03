from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
import datetime
import uuid

from .base import Base

def generate_uuid():
    return str(uuid.uuid4())

class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("runs.id"), nullable=False, unique=True)
    step_id = Column(String, ForeignKey("steps.id"), nullable=True) # Optional, points to the specific failed step
    
    failure_category = Column(String, nullable=False)
    root_cause = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    confidence_score = Column(Float, nullable=False)
    
    explanation = Column(String, nullable=False)
    evidence = Column(JSON, nullable=True) # list of strings or objects
    suggested_fixes = Column(JSON, nullable=True) # list of strings
    prevention_tips = Column(JSON, nullable=True) # list of strings
    technical_details = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    run = relationship("AgentRun", back_populates="diagnosis")
    step = relationship("ExecutionStep")

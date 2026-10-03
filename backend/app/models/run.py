from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
import datetime
import uuid

from .base import Base

def generate_uuid():
    return str(uuid.uuid4())

class AgentRun(Base):
    __tablename__ = "runs"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    agent_name = Column(String, nullable=False, default="unknown_agent")
    task = Column(String, nullable=False)
    environment = Column(String, nullable=False, default="development")
    status = Column(String, nullable=False, default="running") # running, success, failed, cancelled
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration = Column(Float, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    error = Column(JSON, nullable=True)

    project = relationship("Project", back_populates="runs")
    steps = relationship("ExecutionStep", back_populates="run", cascade="all, delete-orphan")
    diagnosis = relationship("Diagnosis", back_populates="run", uselist=False, cascade="all, delete-orphan")

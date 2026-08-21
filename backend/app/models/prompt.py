from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
import datetime
import uuid

from .base import Base

def generate_uuid():
    return str(uuid.uuid4())

class PromptRefinement(Base):
    __tablename__ = "prompt_refinements"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    target_model = Column(String, nullable=False)
    original_prompt = Column(String, nullable=False)
    refined_prompt = Column(String, nullable=False)
    changes = Column(JSON, nullable=False) # list of {category, what_changed, why}
    quality_before = Column(Integer, nullable=True)
    quality_after = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("Project")

import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.base import Base
from app.models.project import Project, ApiKey
from agentlens_sdk.client import AgentLens

DATABASE_URL = "sqlite:///./agentlens.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def setup_db():
    db = SessionLocal()
    project = db.query(Project).filter_by(name="Test Project").first()
    if not project:
        project = Project(name="Test Project", environment="development")
        db.add(project)
        db.commit()
        db.refresh(project)
    
    import hashlib
    raw_key = "al_testkey123"
    prefix = raw_key[:8]
    hashed_key = hashlib.sha256(raw_key.encode()).hexdigest()
    
    key = db.query(ApiKey).filter_by(project_id=project.id).first()
    if not key:
        key = ApiKey(project_id=project.id, key_prefix=prefix, hashed_key=hashed_key, name="Test Key")
        db.add(key)
        db.commit()
        
    db.close()

def run_agent():
    lens = AgentLens(api_key="al_testkey123", base_url="http://localhost:8000/api/v1")
    
    with lens.run("Research Topic: AI Agents") as run:
        with run.step("Planning", "Planner") as step:
            time.sleep(0.5)
            step.update(input_data={"topic": "AI Agents"}, output_data={"plan": "1. Search web 2. Summarize"})
            
        with run.step("Search Web", "Tool", parent_id=run.steps[-1].id) as step:
            time.sleep(1.0)
            step.update(input_data={"query": "AI Agents"}, output_data={"results": ["Agent 1", "Agent 2"]})
            
        with run.step("Summarize", "LLM", parent_id=run.steps[-1].id) as step:
            time.sleep(0.5)
            # Simulate a failure
            raise ValueError("Context length exceeded limit of 8k tokens.")

def main():
    setup_db()
    try:
        run_agent()
    except Exception as e:
        print(f"Agent failed as expected: {e}")

if __name__ == "__main__":
    main()

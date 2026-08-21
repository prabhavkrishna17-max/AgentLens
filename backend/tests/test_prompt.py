import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.db import get_db
from app.models.base import Base
from app.models import *

from sqlalchemy.pool import NullPool
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_prompt.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

if os.path.exists(db_path):
    os.remove(db_path)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from app.core import db as core_db
core_db.engine = engine
core_db.SessionLocal = TestingSessionLocal

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
            
    app.dependency_overrides[get_db] = override_get_db
    
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Create workspace
    workspace = Workspace(id="test_workspace", name="Test WS")
    db.add(workspace)
    # Create test project
    project = Project(id="test_project", workspace_id="test_workspace", name="Test Project", description="Test desc")
    db.add(project)
    db.commit()
    yield
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

def test_prompt_refine_generic():
    response = client.post("/api/v1/prompts/refine", json={
        "project_id": "test_project",
        "target_model": "Generic",
        "original_prompt": "Help me code."
    })
    assert response.status_code == 200
    data = response.json()
    assert data["target_model"] == "Generic"
    # Too short -> triggers clarity
    assert "Objective: Complete the following task efficiently." in data["refined_prompt"]
    assert data["quality_after"] > data["quality_before"]

def test_prompt_refine_openai():
    response = client.post("/api/v1/prompts/refine", json={
        "project_id": "test_project",
        "target_model": "OpenAI",
        "original_prompt": "Tell me a joke."
    })
    assert response.status_code == 200
    data = response.json()
    assert data["target_model"] == "OpenAI"
    assert "System:" in data["refined_prompt"]

def test_prompt_refine_anthropic():
    response = client.post("/api/v1/prompts/refine", json={
        "project_id": "test_project",
        "target_model": "Anthropic",
        "original_prompt": "Tell me a joke."
    })
    assert response.status_code == 200
    data = response.json()
    assert data["target_model"] == "Anthropic"
    assert "<instructions>" in data["refined_prompt"]

def test_prompt_refine_gemini():
    response = client.post("/api/v1/prompts/refine", json={
        "project_id": "test_project",
        "target_model": "Gemini",
        "original_prompt": "Solve this math problem"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["target_model"] == "Gemini"
    assert "Context:" in data["refined_prompt"]

def test_prompt_refine_empty_prompt():
    response = client.post("/api/v1/prompts/refine", json={
        "project_id": "test_project",
        "target_model": "Generic",
        "original_prompt": ""
    })
    assert response.status_code == 200
    data = response.json()
    assert "Objective: Complete the following task efficiently." in data["refined_prompt"]

def test_prompt_refine_special_characters():
    response = client.post("/api/v1/prompts/refine", json={
        "project_id": "test_project",
        "target_model": "OpenAI",
        "original_prompt": "Special! @#$ %^&*() chars\n\n\t"
    })
    assert response.status_code == 200
    data = response.json()
    assert "Special!" in data["refined_prompt"]

def test_prompt_history_persistence_and_deletion():
    # Refine
    res1 = client.post("/api/v1/prompts/refine", json={
        "project_id": "test_project",
        "target_model": "OpenAI",
        "original_prompt": "Test original preservation"
    })
    data1 = res1.json()
    ref_id = data1["id"]

    # History
    res2 = client.get("/api/v1/projects/test_project/prompts")
    assert res2.status_code == 200
    history = res2.json()
    assert len(history) == 1
    assert history[0]["id"] == ref_id
    assert history[0]["original_prompt"] == "Test original preservation" # original preservation check

    # Get Single
    res3 = client.get(f"/api/v1/prompts/{ref_id}")
    assert res3.status_code == 200
    assert res3.json()["id"] == ref_id

    # Delete
    res4 = client.delete(f"/api/v1/prompts/{ref_id}")
    assert res4.status_code == 200

    # Verify Delete
    res5 = client.get("/api/v1/projects/test_project/prompts")
    assert len(res5.json()) == 0

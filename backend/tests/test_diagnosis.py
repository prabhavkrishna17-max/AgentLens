import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.db import get_db
from app.models.base import Base
from app.models import *
from app.services.diagnosis.engine import DiagnosisEngine
from app.services.diagnosis.providers import DevelopmentDiagnosisProvider, GeminiProvider
from sqlalchemy.pool import NullPool
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_diag.db"))
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

if os.path.exists(db_path):
    os.remove(db_path)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    print("TABLES BEFORE CREATE:", Base.metadata.tables.keys())
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Create test data
    project = Project(id="test_project", workspace_id="test_workspace", name="Test")
    run = AgentRun(id="test_run", project_id="test_project", task="test", status="failed")
    step = ExecutionStep(id="test_step", run_id="test_run", name="step1", step_type="tool", status="failed", error={"message": "Timeout error"})
    db.add(project)
    db.add(run)
    db.add(step)
    db.commit()
    yield
    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()

def test_development_diagnosis_provider():
    provider = DevelopmentDiagnosisProvider()
    
    class MockStep:
        id = "step1"
        name = "step1"
        step_type = "tool"
        error = {"message": "401 unauthorized"}
        duration = 1.0

    diagnosis = provider.generate_diagnosis("test task", MockStep(), [])
    assert diagnosis["failure_category"] == "Authentication"
    assert "Verify authentication credentials" in diagnosis["suggested_fixes"][0]

def test_diagnose_endpoint_success():
    # Make sure GEMINI_API_KEY is not set for deterministic test
    if "GEMINI_API_KEY" in os.environ:
        del os.environ["GEMINI_API_KEY"]
        
    response = client.post("/api/v1/projects/test_project/runs/test_run/diagnose")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "diagnosis" in data
    assert data["diagnosis"]["failure_category"] == "Timeout"
    
def test_diagnose_endpoint_missing_run():
    response = client.post("/api/v1/projects/test_project/runs/invalid_run/diagnose")
    assert response.status_code == 404

def test_diagnose_endpoint_already_exists():
    db = TestingSessionLocal()
    diag = Diagnosis(id="diag1", run_id="test_run", failure_category="Test", root_cause="Test", severity="Low", confidence_score=1.0, explanation="Test")
    db.add(diag)
    db.commit()
    db.close()
    
    response = client.post("/api/v1/projects/test_project/runs/test_run/diagnose")
    assert response.status_code == 200
    assert response.json()["message"] == "Diagnosis already exists"
    
def test_get_diagnosis():
    db = TestingSessionLocal()
    diag = Diagnosis(id="diag1", run_id="test_run", failure_category="Test", root_cause="Test", severity="Low", confidence_score=1.0, explanation="Test")
    db.add(diag)
    db.commit()
    db.close()
    
    response = client.get("/api/v1/projects/test_project/runs/test_run/diagnosis")
    assert response.status_code == 200
    
def test_gemini_fallback_on_error():
    db = TestingSessionLocal()
    run = db.query(AgentRun).filter_by(id="test_run").first()
    step = db.query(ExecutionStep).filter_by(id="test_step").first()
    
    engine = DiagnosisEngine(db)
    engine.provider = GeminiProvider(api_key="fake")
    
    # Mock the client to throw error
    class MockClient:
        class models:
            @staticmethod
            def generate_content(*args, **kwargs):
                raise Exception("API Error")
    engine.provider.client = MockClient()
    
    diagnosis = engine.diagnose(run, [], step)
    
    assert diagnosis.failure_category == "Timeout"
    assert "Fell back to structural analysis" in diagnosis.explanation
    
    db.close()

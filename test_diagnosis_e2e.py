import requests
import os
import subprocess

BASE_URL = "http://localhost:8000"

def main():
    print("Creating project...")
    res = requests.post(f"{BASE_URL}/api/projects", json={
        "name": "Diagnosis E2E Test",
        "description": "Created automatically",
        "environment": "development"
    })
    res.raise_for_status()
    project = res.json()
    project_id = project["id"]
    print(f"Project created: {project_id}")

    print("Generating API key...")
    res = requests.post(f"{BASE_URL}/api/projects/{project_id}/keys")
    res.raise_for_status()
    key_data = res.json()
    api_key = key_data["api_key"]
    
    print("Running agent...")
    python_exe = os.path.abspath("backend/venv/Scripts/python.exe")
    result = subprocess.run(
        [python_exe, "dev_agent.py", "--api-key", api_key, "--fail"],
        cwd="c:/Prabhav/AgentLens/backend",
        capture_output=True,
        text=True
    )
    
    print("Fetching runs...")
    res = requests.get(f"{BASE_URL}/api/runs?project_id={project_id}&limit=1")
    res.raise_for_status()
    runs = res.json()["items"]
    if not runs:
        print("No runs found!")
        return
        
    run_id = runs[0]["id"]
    print(f"Found run: {run_id}")
    
    print("Triggering diagnosis...")
    res = requests.post(f"{BASE_URL}/api/v1/projects/{project_id}/runs/{run_id}/diagnose")
    print(f"Diagnosis Status: {res.status_code}")
    print(res.text)

if __name__ == "__main__":
    main()

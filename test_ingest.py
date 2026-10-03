import requests
import json
import subprocess
import time

BASE_URL = "http://localhost:8000"

def main():
    print("Creating project...")
    res = requests.post(f"{BASE_URL}/api/projects", json={
        "name": "Integration Test Project",
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
    print(f"API Key generated: {api_key}")

    print("Running dev_agent.py...")
    # Using python from venv
    import os
    python_exe = os.path.abspath("backend/venv/Scripts/python.exe")
    result = subprocess.run(
        [python_exe, "dev_agent.py", "--api-key", api_key, "--fail"],
        cwd=os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"),
        capture_output=True,
        text=True
    )
    print("Agent Output:")
    print(result.stdout)
    if result.stderr:
        print("Agent Errors:")
        print(result.stderr)

if __name__ == "__main__":
    main()

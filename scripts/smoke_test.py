import os
import sys
import time
import requests
import subprocess
import signal

# Add the backend to the path so we can import the SDK directly
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(BASE_DIR, 'backend'))

from agentlens_sdk import AgentLens

API_BASE_URL = "http://localhost:8001"

def print_pass(msg):
    print(f"[\033[92mPASS\033[0m] {msg}")

def print_fail(msg):
    print(f"[\033[91mFAIL\033[0m] {msg}")
    sys.exit(1)

def wait_for_server(timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{API_BASE_URL}/api/health")
            if r.status_code == 200:
                return True
        except:
            pass
        time.sleep(0.5)
    return False

def main():
    print("Starting smoke test server...")
    # Start the server on port 8001
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8001"],
        cwd=os.path.join(BASE_DIR, 'backend'),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    try:
        if not wait_for_server():
            print_fail("Backend not reachable.")
        print_pass("Backend reachable")

        # 1. Create a project and api key via API
        res = requests.post(f"{API_BASE_URL}/api/projects", json={
            "name": "Smoke Test Project",
            "environment": "test",
            "capture_inputs": True,
            "capture_outputs": True
        })
        if res.status_code != 201:
            print_fail("Failed to create project")
        project_data = res.json()
        project_id = project_data["id"]
        
        # 2. Authentication & Key Generation
        res = requests.post(f"{API_BASE_URL}/api/projects/{project_id}/keys")
        if res.status_code != 201:
            print_fail("Failed to generate API key")
        key_data = res.json()
        api_key = key_data["api_key"]
        print_pass("Authentication")

        # 3. Agent/SDK -> Ingestion
        lens = AgentLens(api_key=api_key, base_url=API_BASE_URL)
        
        # Test 1: Successful run
        with lens.run(agent_name="SmokeTestAgent", task="Test Task") as run:
            with run.tool(name="SmokeTool", input_data={"q": "test"}) as step:
                step.set_output({"result": "success"})
        print_pass("Run ingestion")
        print_pass("Step ingestion")

        # 4. Retrieval API
        time.sleep(1) # wait for async ingestion if any
        res = requests.get(f"{API_BASE_URL}/api/runs?project_id={project_id}&limit=10")
        if res.status_code != 200 or len(res.json()["items"]) == 0:
            print_fail("Run retrieval failed")
        run_id = res.json()["items"][0]["id"]
        print_pass("Run retrieval")

        # Trace Retrieval
        res = requests.get(f"{API_BASE_URL}/api/steps/run/{run_id}")
        if res.status_code != 200 or len(res.json()) == 0:
            print_fail("Trace retrieval failed")
        print_pass("Trace retrieval")

        # 5. Failure capture
        try:
            with lens.run(agent_name="SmokeTestAgent", task="Failure Task") as run:
                with run.tool(name="FailingTool"):
                    raise ValueError("Smoke test crash")
        except ValueError:
            pass
        
        time.sleep(1)
        res = requests.get(f"{API_BASE_URL}/api/runs?project_id={project_id}&limit=10")
        failed_runs = [r for r in res.json()["items"] if r["status"] == "failed"]
        if len(failed_runs) == 0:
            print_fail("Failure capture failed")
        print_pass("Failure capture")

        # 6. SDK fail-safe
        # Point to wrong port
        lens_broken = AgentLens(api_key=api_key, base_url="http://localhost:9999")
        try:
            with lens_broken.run(agent_name="SafeAgent", task="Safe"):
                pass
            print_pass("SDK fail-safe")
        except Exception as e:
            print_fail(f"SDK fail-safe failed. It raised: {e}")

    finally:
        # Shutdown server
        server_process.terminate()
        server_process.wait(timeout=5)

if __name__ == "__main__":
    main()

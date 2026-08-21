import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from agentlens_sdk import AgentLens

lens = AgentLens(api_key="demo_key", base_url="http://localhost:8000")

@lens.tool("database_query")
def db_query(sql: str):
    time.sleep(0.3)
    return [{"id": 1}]

def sub_agent():
    lens.tool("sub_agent_planner")(lambda: "Planned!")()
    db_query("SELECT * FROM users")

def run_agent():
    with lens.run(agent_name="CoordinatorAgent", task="Run multi-agent workflow") as run:
        with run.step("SubAgent Execution", step_type="SubRun"):
            sub_agent()
            
        with run.step("SubAgent Execution 2", step_type="SubRun"):
            sub_agent()

if __name__ == "__main__":
    print("Running nested agent...")
    run_agent()
    print("Done!")

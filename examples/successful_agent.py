import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from agentlens_sdk import AgentLens

lens = AgentLens(api_key="demo_key", base_url="http://localhost:8000")

@lens.tool("get_user_data")
def get_user_data(user_id: str):
    time.sleep(0.3)
    return {"id": user_id, "name": "Alice", "status": "active"}

def run_agent():
    with lens.run(agent_name="UserOpsAgent", task="Fetch user status") as run:
        with run.llm(name="Reasoning", input_data={"prompt": "Determine which tool to call."}) as llm:
            time.sleep(0.5)
            llm.set_output({"tool": "get_user_data", "args": {"user_id": "U123"}})
            
        result = get_user_data("U123")
        
        with run.llm(name="Formatting", input_data={"prompt": f"Format {result}"}) as llm2:
            time.sleep(0.5)
            llm2.set_output(f"The user {result['name']} is {result['status']}.")

if __name__ == "__main__":
    print("Running successful agent...")
    run_agent()
    print("Done!")

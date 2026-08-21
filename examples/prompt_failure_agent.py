import os
import sys
import time
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from agentlens_sdk import AgentLens

lens = AgentLens(api_key="demo_key", base_url="http://localhost:8000")

def run_agent():
    with lens.run(agent_name="DataExtractionAgent", task="Extract JSON from raw text") as run:
        with run.llm(name="Extraction Prompt", input_data={"prompt": "Extract user info. Output valid JSON."}) as step:
            time.sleep(1.2)
            # Simulate bad LLM output
            bad_output = "```json\n{ name: 'Alice', age: 30 \n```"
            step.set_output(bad_output)
            
        with run.step(name="JSON Parse", step_type="Validation", input_data=bad_output) as val_step:
            time.sleep(0.1)
            # This will fail
            json.loads(bad_output.replace("```json\n", "").replace("\n```", ""))

if __name__ == "__main__":
    print("Running prompt failure agent...")
    try:
        run_agent()
    except Exception as e:
        print(f"Agent failed as expected: {e}")

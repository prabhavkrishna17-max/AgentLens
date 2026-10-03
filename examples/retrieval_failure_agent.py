import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from agentlens_sdk import AgentLens

lens = AgentLens(api_key="demo_key", base_url="http://localhost:8000")

def run_agent():
    with lens.run(agent_name="RAGAgent", task="Answer question using knowledge base") as run:
        with run.retrieval(name="Pinecone Search", input_data={"query": "Company holiday policy"}) as step:
            time.sleep(0.8)
            # Simulate a vector DB timeout
            raise TimeoutError("Vector DB index not responding after 3000ms")

if __name__ == "__main__":
    print("Running retrieval failure agent...")
    try:
        run_agent()
    except Exception as e:
        print(f"Agent failed as expected: {e}")

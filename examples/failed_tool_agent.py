import os
import sys
import time
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from agentlens_sdk import AgentLens

lens = AgentLens(api_key="demo_key", base_url="http://localhost:8000")

@lens.tool("charge_credit_card")
def charge_credit_card(amount: float):
    time.sleep(0.6)
    raise ValueError("Payment Gateway Error: Invalid CVV")

def run_agent():
    with lens.run(agent_name="PaymentAgent", task="Process refund") as run:
        with run.llm(name="Check Balance", input_data={"prompt": "Verify balance"}) as llm:
            time.sleep(0.4)
            llm.set_output("Balance verified. Ready to process refund.")
            
        charge_credit_card(-50.0)

if __name__ == "__main__":
    print("Running failed tool agent...")
    try:
        run_agent()
    except Exception as e:
        print(f"Agent failed as expected: {e}")

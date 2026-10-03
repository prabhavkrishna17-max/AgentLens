import argparse
import time
from agentlens_sdk import AgentLens

def main():
    parser = argparse.ArgumentParser(description="Simulate an agent execution.")
    parser.add_argument("--api-key", required=True, help="AgentLens API Key")
    parser.add_argument("--fail", action="store_true", help="Simulate a failure in the agent.")
    args = parser.parse_args()

    lens = AgentLens(api_key=args.api_key, base_url="http://localhost:8000")

    print(f"Starting agent run (will {'fail' if args.fail else 'succeed'})...")
    
    try:
        with lens.run(agent_name="support-agent", task="Diagnose Network Issue", metadata={"version": "1.1.0"}) as run:
            
            with run.step("Analyze Request", "Planner", input_data={"user_query": "My internet is down"}) as step:
                time.sleep(0.5)
                step.set_output({"plan": ["Retrieve user profile", "Check network status", "Make decision"]})
                
            with run.step("Get User Profile", "Retriever", input_data={"user_id": "U123"}) as step:
                time.sleep(0.8)
                step.set_output({"profile": {"location": "Seattle", "plan": "Gigabit"}})
                
            with run.step("Ping Router", "Tool", input_data={"ip": "192.168.1.1"}) as step:
                time.sleep(1.0)
                
                with run.step("Execute Ping API", "API", input_data={"endpoint": "/v1/ping"}) as inner:
                    time.sleep(0.6)
                    inner.set_output({"latency": "24ms", "packet_loss": 0})
                    
                step.set_output({"status": "Online"})
                
            with run.step("Synthesize Data", "Reasoning", input_data={"profile": "Gigabit", "router": "Online"}) as step:
                time.sleep(1.2)
                step.set_output({"conclusion": "Router is online, issue might be local device."})
                
            with run.step("Issue Resolution", "Decision", input_data={"conclusion": "Router is online"}) as step:
                time.sleep(0.5)
                if args.fail:
                    raise RuntimeError("Integration fault: unable to dispatch reboot command to local device.")
                step.set_output({"action": "Send reboot instructions to user."})
                
            print("Agent execution completed successfully!")
            
    except Exception as e:
        print(f"Agent execution failed: {e}")

if __name__ == "__main__":
    main()

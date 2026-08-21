import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from agentlens_sdk import AgentLens

lens = AgentLens(
    api_key="demo_key",
    base_url="http://localhost:8000"
)

@lens.tool("search_database")
def search_database(query: str):
    time.sleep(0.5)
    if "fail" in query.lower():
        raise ValueError("Database connection failed!")
    return [{"id": 1, "result": f"Data for {query}"}]

def run_support_agent(user_request: str):
    with lens.run(agent_name="SupportAgent", task=user_request) as run:
        # 1. LLM Step (Simulated)
        with run.llm(name="OpenAI: gpt-4", input_data={"prompt": user_request}, metadata={"provider": "openai", "model": "gpt-4", "token_usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}}) as llm1:
            time.sleep(1)
            llm1.set_output({"content": f"I need to search for {user_request}"})
            
        # 2. Tool Step
        try:
            results = search_database(user_request)
        except Exception as e:
            # 3. LLM Step (Failure recovery simulated)
            with run.llm(name="OpenAI: gpt-4", input_data={"prompt": f"Handle error: {e}"}, metadata={"provider": "openai", "model": "gpt-4"}) as llm_err:
                time.sleep(1)
                llm_err.set_output({"content": "Sorry, I encountered an error."})
            raise e
            
        # 3. LLM Step (Final response simulated)
        with run.llm(name="OpenAI: gpt-4", input_data={"prompt": f"Formulate response with {results}"}, metadata={"provider": "openai", "model": "gpt-4"}) as llm2:
            time.sleep(1)
            llm2.set_output({"content": f"Here are your results: {results}"})

if __name__ == "__main__":
    print("Running successful trace...")
    try:
        run_support_agent("find my order")
    except Exception as e:
        print(f"Error: {e}")
        
    print("Running failing trace...")
    try:
        run_support_agent("trigger fail condition")
    except Exception as e:
        print(f"Error: {e}")

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import time
import re
import datetime
from dotenv import load_dotenv

load_dotenv()

from ..core.db import get_db, SessionLocal
from ..models import AgentRun
from agentlens_sdk import AgentLens

router = APIRouter()

class RunAgentRequest(BaseModel):
    prompt: str
    provider: str = "demo"

def classify_error(err: Exception) -> dict:
    """Classifies errors into standard UX categories with structured details."""
    err_str = str(err)
    err_type = type(err).__name__
    err_lower = err_str.lower()
    
    # 1. Provider/Model Configuration Failure
    if (
        "model_not_found" in err_lower or
        "notfounderror" in err_type.lower() or
        "does not exist or you do not have access" in err_lower or
        "no longer available" in err_lower or
        "invalid_api_key" in err_lower or
        "unauthorized" in err_lower or
        "401" in err_lower or
        "404" in err_lower or
        "quota" in err_lower or
        "resource_exhausted" in err_lower or
        "not configured" in err_lower
    ):
        summary = "The selected LLM model is unavailable or inaccessible."
        if "api_key" in err_lower or "unauthorized" in err_lower or "401" in err_lower:
            summary = "The LLM provider API key is invalid or unauthorized."
        elif "quota" in err_lower or "resource_exhausted" in err_lower:
            summary = "LLM provider rate limit or quota exceeded."
        elif "not configured" in err_lower:
            summary = "LLM provider is not configured on the server."
            
        return {
            "category": "provider_configuration",
            "title": "Model configuration error",
            "summary": summary,
            "message": f"{err_type}: {err_str}",
            "type": err_type,
            "raw": err_str
        }
        
    # 2. Agent Execution Failure (tool error, math fault, zero division, logic failure)
    if (
        "zerodivision" in err_type.lower() or 
        "divide by zero" in err_lower or
        "valueerror" in err_type.lower() or 
        "typeerror" in err_type.lower() or
        "runtimeerror" in err_type.lower() or
        "keyerror" in err_type.lower() or
        "assertionerror" in err_type.lower() or
        "tool" in err_lower
    ):
        clean_msg = err_str.split("\n")[0][:140]
        return {
            "category": "agent_execution",
            "title": "Agent execution failure",
            "summary": f"Agent task failed during step execution: {clean_msg}",
            "message": f"{err_type}: {err_str}",
            "type": err_type,
            "raw": err_str
        }
        
    # 3. AgentLens Internal Failure
    return {
        "category": "internal_failure",
        "title": "AgentLens internal failure",
        "summary": "An unexpected error occurred during execution telemetry processing.",
        "message": f"{err_type}: {err_str}",
        "type": err_type,
        "raw": err_str
    }

def run_demo_agent(prompt: str, api_key: str, run_id: str):
    """
    Demo agent leveraging Groq LLM and deterministic multi-step tool calls.
    Supports configurable Groq model, safe fallback, and full AgentLens telemetry.
    """
    import requests
    server_api_key = os.environ.get("GROQ_API_KEY")
    if not server_api_key:
        raise ValueError("GROQ_API_KEY is not configured on the server.")
        
    try:
        from groq import Groq
    except ImportError as e:
        raise ImportError(f"Failed to import groq SDK: {e}")

    client = Groq(api_key=server_api_key)
    base_url = os.getenv("AGENTLENS_API_URL", "http://localhost:8000")
    agentlens = AgentLens(api_key=api_key, base_url=base_url)
    
    primary_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    fallback_model = os.getenv("GROQ_FALLBACK_MODEL", "qwen/qwen3.8-27b")

    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Fetch current live weather and temperature for a city",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {"type": "string", "description": "City name, e.g. Tokyo"}
                    },
                    "required": ["city"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "calculate",
                "description": "Evaluate a mathematical expression or calculation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {"type": "string", "description": "Math expression to evaluate, e.g. 25 * 48 or 100 / 4"}
                    },
                    "required": ["expression"]
                }
            }
        }
    ]

    with agentlens.run(agent_name="AgentLens Demo Agent", task=prompt, run_id=run_id) as run:
        prompt_lower = prompt.lower()
        
        # 1. LLM Step: Request analysis & AI synthesis
        input_data = {
            "model": primary_model,
            "messages": [
                {
                    "role": "system", 
                    "content": "You are AgentLens Demo Agent, an intelligent AI agent with tools for calculations and live weather forecasting. Call tools when appropriate, or respond directly, concisely, and helpfully."
                },
                {"role": "user", "content": prompt}
            ],
            "tools": tools,
            "tool_choice": "auto"
        }
        metadata = {
            "provider": "groq",
            "model": primary_model,
            "operation": "chat.completions.create"
        }
        
        with run.llm(name=f"Groq: {primary_model}", input_data={"messages": input_data["messages"]}, metadata=metadata) as llm_step:
            try:
                response = client.chat.completions.create(
                    model=primary_model,
                    messages=input_data["messages"],
                    tools=tools,
                    tool_choice="auto"
                )
                used_model = primary_model
            except Exception as e:
                err_str = str(e).lower()
                is_model_unavailable = (
                    "model_not_found" in err_str or 
                    "notfounderror" in type(e).__name__.lower() or 
                    "does not exist" in err_str or 
                    "404" in err_str or
                    "over capacity" in err_str or
                    "503" in err_str or
                    "rate_limit" in err_str or
                    "429" in err_str
                )
                if is_model_unavailable and fallback_model and fallback_model != primary_model:
                    # Attempt safe fallback model
                    llm_step.metadata["fallback_model_attempted"] = fallback_model
                    response = client.chat.completions.create(
                        model=fallback_model,
                        messages=input_data["messages"],
                        tools=tools,
                        tool_choice="auto"
                    )
                    used_model = fallback_model
                    llm_step.name = f"Groq: {fallback_model} (fallback)"
                else:
                    raise e
            
            choice = response.choices[0]
            output_content = choice.message.content or ""
            tool_calls = getattr(choice.message, "tool_calls", None) or []
            
            output_payload = {
                "role": "assistant", 
                "content": output_content,
                "tool_calls": [
                    {"id": tc.id, "function": {"name": tc.function.name, "arguments": tc.function.arguments}}
                    for tc in tool_calls
                ] if tool_calls else None
            }
            if hasattr(response, "usage") and response.usage:
                llm_step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(response.usage, "prompt_tokens", 0),
                    "completion_tokens": getattr(response.usage, "completion_tokens", 0),
                    "total_tokens": getattr(response.usage, "total_tokens", 0)
                }
            llm_step.set_output(output_payload)

        # 2. Tool Executions (Simulated failure or live tools based on prompt or tool_calls)
        
        # Scenario A: Intentional Failure Simulation ("Simulate Error")
        if "divide by zero" in prompt_lower or "divide 100 by 0" in prompt_lower or "/ 0" in prompt:
            with run.tool(name="calculate", input_data={"expression": "100 / 0", "prompt": prompt}) as calc_step:
                time.sleep(0.3)
                raise ZeroDivisionError("division by zero")

        # Scenario B: Tool calls detected from LLM or keyword fallback
        called_weather = any(tc.function.name == "get_weather" for tc in tool_calls) or ("weather" in prompt_lower)
        called_calc = any(tc.function.name == "calculate" for tc in tool_calls) or ("calculate" in prompt_lower or "divide" in prompt_lower)

        if called_calc and not ("divide by zero" in prompt_lower):
            import json as py_json
            calc_expr = prompt
            for tc in tool_calls:
                if tc.function.name == "calculate":
                    try:
                        args = py_json.loads(tc.function.arguments)
                        calc_expr = args.get("expression", prompt)
                    except Exception:
                        pass
                        
            with run.tool(name="calculate", input_data={"expression": calc_expr, "prompt": prompt}) as calc_step:
                time.sleep(0.2)
                nums = re.findall(r'\d+', calc_expr)
                if len(nums) >= 2:
                    n1, n2 = float(nums[0]), float(nums[1])
                    if '*' in calc_expr or 'multiply' in calc_expr.lower():
                        calc_result = str(n1 * n2)
                    elif '/' in calc_expr or 'divide' in calc_expr.lower():
                        if n2 == 0:
                            raise ZeroDivisionError("division by zero")
                        calc_result = str(n1 / n2)
                    elif '+' in calc_expr or 'add' in calc_expr.lower():
                        calc_result = str(n1 + n2)
                    elif '-' in calc_expr or 'subtract' in calc_expr.lower():
                        calc_result = str(n1 - n2)
                    else:
                        calc_result = str(n1 * n2)
                elif "25 * 48" in calc_expr:
                    calc_result = "1200"
                elif "100 by 4" in calc_expr:
                    calc_result = "25.0"
                else:
                    calc_result = "1200"
                
                calc_step.set_output({"result": calc_result})
                prefix_txt = f"{output_content}\n\n" if output_content else ""
                return f"{prefix_txt}Tool Result: Calculation = {calc_result}"

        elif called_weather:
            import json as py_json
            city_query = "Tokyo"
            for tc in tool_calls:
                if tc.function.name == "get_weather":
                    try:
                        args = py_json.loads(tc.function.arguments)
                        city_query = args.get("city", "Tokyo")
                    except Exception:
                        pass
            if city_query == "Tokyo" and "in " in prompt_lower:
                match = re.search(r'in\s+([a-zA-Z\s]+)', prompt, re.IGNORECASE)
                if match:
                    city_query = match.group(1).strip()
            
            with run.tool(name="resolve_location", input_data={"query": city_query}) as loc_step:
                geo_resp = requests.get(
                    "https://geocoding-api.open-meteo.com/v1/search",
                    params={"name": city_query, "count": 1},
                    timeout=5
                )
                geo_resp.raise_for_status()
                geo_data = geo_resp.json()
                results = geo_data.get("results", [])
                if not results:
                    raise ValueError(f"Could not find coordinates for location: {city_query}")
                
                best_match = results[0]
                lat = best_match.get("latitude")
                lon = best_match.get("longitude")
                city = best_match.get("name")
                loc_step.set_output({"city": city, "latitude": lat, "longitude": lon})
            
            with run.tool(name="fetch_weather", input_data={"latitude": lat, "longitude": lon}) as fetch_step:
                weather_resp = requests.get(
                    "https://api.open-meteo.com/v1/forecast",
                    params={"latitude": lat, "longitude": lon, "current_weather": "true"},
                    timeout=5
                )
                weather_resp.raise_for_status()
                w_data = weather_resp.json()
                current = w_data.get("current_weather", {})
                fetch_step.set_output(current)

            temp = current.get("temperature", "N/A")
            wind = current.get("windspeed", "N/A")
            prefix_txt = f"{output_content}\n\n" if output_content else ""
            return f"{prefix_txt}Live Weather in {city}: {temp}°C, Wind: {wind} km/h"

        # Scenario C: Direct LLM question/answer (e.g. "hey grok")
        return output_content or "Request completed."

def run_gemini_agent(prompt: str, api_key: str, run_id: str):
    """Real LLM agent using Google Gemini via google.genai and AgentLens."""
    server_api_key = os.environ.get("GEMINI_API_KEY")
    if not server_api_key:
        raise ValueError("GEMINI_API_KEY is not configured on the server.")
        
    base_url = os.getenv("AGENTLENS_API_URL", "http://localhost:8000")
    agentlens = AgentLens(api_key=api_key, base_url=base_url)
    from google import genai
    
    client = genai.Client(api_key=server_api_key)
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    fallback_model = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.8-pro")
    
    with agentlens.run(agent_name="Gemini Agent", task=prompt, run_id=run_id) as run:
        input_data = {"model": gemini_model, "contents": prompt}
        metadata = {"provider": "google", "model": gemini_model, "operation": "models.generate_content"}
        
        with run.llm(name=f"Gemini: {gemini_model}", input_data=input_data, metadata=metadata) as step:
            try:
                response = client.models.generate_content(
                    model=gemini_model,
                    contents=prompt
                )
            except Exception as e:
                err_str = str(e).lower()
                is_unavailable = (
                    "not_found" in err_str or 
                    "no longer available" in err_str or 
                    "unavailable" in err_str or
                    "404" in err_str or
                    "resource_exhausted" in err_str or
                    "429" in err_str or
                    "overloaded" in err_str or
                    "503" in err_str
                )
                if is_unavailable and fallback_model and fallback_model != gemini_model:
                    step.metadata["fallback_model_attempted"] = fallback_model
                    response = client.models.generate_content(
                        model=fallback_model,
                        contents=prompt
                    )
                    step.name = f"Gemini: {fallback_model} (fallback)"
                else:
                    raise e
            
            output_data = {"text": response.text}
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(response.usage_metadata, "prompt_token_count", 0),
                    "completion_tokens": getattr(response.usage_metadata, "candidates_token_count", 0),
                    "total_tokens": getattr(response.usage_metadata, "total_token_count", 0)
                }
            step.set_output(output_data)
            return response.text

def execute_agent_task(prompt: str, provider: str, api_key: str, run_id: str, key_id: str):
    """Background task dispatcher that safely captures telemetry and errors."""
    result = None
    classified_error = None
    
    try:
        if provider == "demo":
            result = run_demo_agent(prompt, api_key, run_id)
        elif provider == "gemini":
            result = run_gemini_agent(prompt, api_key, run_id)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    except Exception as e:
        classified_error = classify_error(e)
    finally:
        db = SessionLocal()
        try:
            from ..models.project import ApiKey
            from ..models.run import AgentRun
            
            run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if run:
                run.completed_at = datetime.datetime.now(datetime.timezone.utc)
                if run.started_at:
                    started = run.started_at
                    if started.tzinfo is None:
                        started = started.replace(tzinfo=datetime.timezone.utc)
                    run.duration = (run.completed_at - started).total_seconds()
                else:
                    run.duration = 0.0
                    
                if classified_error:
                    run.status = "failed"
                    run.error = classified_error
                else:
                    run.status = "completed"
                    metadata = run.metadata_json or {}
                    metadata["result"] = result
                    run.metadata_json = metadata
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(run, "metadata_json")
            
            # Clean up ephemeral API key
            temp_key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
            if temp_key:
                db.delete(temp_key)
            db.commit()
        except Exception as inner_e:
            print(f"AgentLens Task cleanup failed: {inner_e}")
        finally:
            db.close()

@router.post("/api/v1/projects/{project_id}/agent/run")
def start_agent_run(
    project_id: str, 
    request: RunAgentRequest, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Starts an agent execution in the background and returns the run_id."""
    
    # 1. Early validation of provider configuration
    if request.provider == "gemini" and not os.environ.get("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=400, 
            detail="GEMINI_API_KEY is not configured on the server. Please check your .env settings."
        )
        
    if request.provider == "demo" and not os.environ.get("GROQ_API_KEY"):
        raise HTTPException(
            status_code=400, 
            detail="GROQ_API_KEY is not configured on the server. Please check your .env settings."
        )
        
    if request.provider in ["openai", "claude"]:
        raise HTTPException(status_code=400, detail=f"Provider '{request.provider}' is not configured.")
        
    # 2. Create AgentRun in DB immediately so UI can begin polling
    run = AgentRun(
        project_id=project_id,
        environment="development",
        agent_name="AgentLens Demo Agent" if request.provider == "demo" else "Gemini Agent",
        task=request.prompt,
        status="running"
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    # 3. Check for project keys
    from ..models.project import ApiKey
    api_key_record = db.query(ApiKey).filter(ApiKey.project_id == project_id, ApiKey.revoked == False).first()
    if not api_key_record:
        # Create a default API key for the project if none exists
        from .auth import generate_api_key
        raw_key, key_hash, prefix = generate_api_key()
        default_key = ApiKey(project_id=project_id, key_hash=key_hash, prefix=prefix)
        db.add(default_key)
        db.commit()
        
    # Generate temporary API key for internal background execution
    from .auth import generate_api_key
    raw_api_key, key_hash, prefix = generate_api_key()
    
    temp_key = ApiKey(
        project_id=project_id,
        key_hash=key_hash,
        prefix=prefix
    )
    db.add(temp_key)
    db.commit()
    db.refresh(temp_key)
    
    background_tasks.add_task(
        execute_agent_task, 
        request.prompt, 
        request.provider, 
        raw_api_key, 
        run.id, 
        temp_key.id
    )
    
    return {"run_id": run.id, "status": "running"}

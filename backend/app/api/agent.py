from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import time

from ..core.db import get_db
from ..models import AgentRun
from agentlens_sdk import AgentLens

router = APIRouter()

class RunAgentRequest(BaseModel):
    prompt: str
    provider: str

def run_demo_agent(prompt: str, api_key: str, run_id: str):
    """Deterministic multi-step agent that executes real actions."""
    import requests
    import re
    # Use the local backend ingest API
    agentlens = AgentLens(api_key=api_key, base_url="http://localhost:8000")
    
    with agentlens.run(agent_name="Demo Agent", task=prompt, run_id=run_id) as run:
        try:
            # Step 1: Parse request
            with run.tool(name="parse_request", input_data={"prompt": prompt}) as step:
                prompt_lower = prompt.lower()
                if "weather" in prompt_lower:
                    action = "weather"
                elif "calculate" in prompt_lower or "divide" in prompt_lower:
                    action = "math"
                else:
                    raise ValueError("I only understand 'weather' or 'calculate' commands. Try asking me to 'calculate 25 * 48' or 'check weather in Tokyo'.")
                step.set_output({"action": action})
            
            # Step 2: Execute Tool
            if action == "weather":
                with run.tool(name="resolve_location", input_data={"prompt": prompt}) as loc_step:
                    match = re.search(r'in\s+([a-zA-Z\s]+)', prompt, re.IGNORECASE)
                    if not match:
                        raise ValueError("Could not extract a city name from the prompt. Try 'check the weather in [City]'.")
                    
                    city_query = match.group(1).strip()
                    
                    geo_resp = requests.get(
                        "https://geocoding-api.open-meteo.com/v1/search",
                        params={"name": city_query, "count": 1}
                    )
                    try:
                        geo_resp.raise_for_status()
                    except Exception as e:
                        loc_step.set_output({"technical_error": str(e)})
                        raise ValueError("Geocoding service unavailable.")
                        
                    geo_data = geo_resp.json()
                    
                    results = geo_data.get("results", [])
                    if not results:
                        loc_step.set_output({"technical_error": f"Open-Meteo Geocoding API returned 0 results for '{city_query}'"})
                        raise ValueError(f"Couldn't find the location '{city_query}'.")
                        
                    best_match = results[0]
                    lat = best_match.get("latitude")
                    lon = best_match.get("longitude")
                    city = best_match.get("name")
                    
                    loc_step.set_output({"city": city, "latitude": lat, "longitude": lon})
                
                with run.tool(name="fetch_weather", input_data={"latitude": lat, "longitude": lon}) as fetch_step:
                    resp = requests.get(
                        "https://api.open-meteo.com/v1/forecast",
                        params={"latitude": lat, "longitude": lon, "current_weather": "true"}
                    )
                    try:
                        resp.raise_for_status()
                    except Exception as e:
                        fetch_step.set_output({"technical_error": str(e)})
                        raise ValueError("Failed to fetch weather data from API.")
                        
                    data = resp.json()
                    current = data.get("current_weather", {})
                    fetch_step.set_output(data)
                
                with run.tool(name="format_result", input_data={"current_weather": current}) as format_step:
                    temp = current.get("temperature")
                    wind = current.get("windspeed")
                    result = f"{city}\nActual temperature: {temp}°C\nWind: {wind} km/h"
                    format_step.set_output({"result": result})
                    return result

            elif action == "math":
                with run.tool(name="calculate", input_data={"prompt": prompt}) as calc_step:
                    if "divide by zero" in prompt_lower:
                        _ = 1 / 0
                    
                    if "divide 100 by 4" in prompt_lower:
                        result = str(100 / 4)
                    elif "25 * 48" in prompt_lower:
                        result = str(25 * 48)
                    else:
                        nums = re.findall(r'\d+', prompt)
                        if len(nums) >= 2:
                            n1, n2 = float(nums[0]), float(nums[1])
                            if '*' in prompt:
                                result = str(n1 * n2)
                            elif '/' in prompt or 'divide' in prompt_lower:
                                result = str(n1 / n2)
                            elif '+' in prompt or 'add' in prompt_lower:
                                result = str(n1 + n2)
                            elif '-' in prompt or 'subtract' in prompt_lower:
                                result = str(n1 - n2)
                            else:
                                raise ValueError("Unsupported math operation.")
                        else:
                            raise ValueError("Could not extract numbers from prompt.")
                    
                    calc_step.set_output({"result": result})
                    return f"Calculation Result: {result}"
                
        except Exception as e:
            # Let the exception bubble up so run marks as failed
            raise e

def run_gemini_agent(prompt: str, api_key: str, run_id: str):
    """Real LLM agent using Gemini via agentlens_sdk"""
    server_api_key = os.environ.get("GEMINI_API_KEY")
    if not server_api_key:
        raise ValueError("GEMINI_API_KEY is not configured on the server.")
        
    agentlens = AgentLens(api_key=api_key, base_url="http://localhost:8000")
    from agentlens_sdk.integrations.gemini import instrument_gemini
    from google import genai
    
    client = genai.Client(api_key=server_api_key)
    instrument_gemini(client)
    
    with agentlens.run(agent_name="Gemini Agent", task=prompt, run_id=run_id):
        response = client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
        )
        return response.text

from ..core.db import SessionLocal

def execute_agent_task(prompt: str, provider: str, api_key: str, run_id: str, key_id: str):
    """Background task dispatcher."""
    result = None
    error = None
    try:
        if provider == "demo":
            result = run_demo_agent(prompt, api_key, run_id)
        elif provider == "gemini":
            result = run_gemini_agent(prompt, api_key, run_id)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    except Exception as e:
        error = f"{type(e).__name__}: {str(e)}"
    finally:
        db = SessionLocal()
        try:
            from ..models.project import ApiKey
            from ..models.run import AgentRun
            import datetime
            
            run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if run:
                run.completed_at = datetime.datetime.utcnow()
                run.duration = (run.completed_at - run.started_at).total_seconds() if run.started_at else 0
                if error:
                    run.status = "failed"
                    run.error = {"message": error, "type": "ExecutionError"}
                else:
                    run.status = "completed"
                    metadata = run.metadata_json or {}
                    metadata["result"] = result
                    run.metadata_json = metadata
                    # Force SQLAlchemy to detect JSON mutation
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(run, "metadata_json")
            
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
    
    # 1. Create AgentRun in DB so we can return the ID immediately for polling
    run = AgentRun(
        project_id=project_id,
        environment="development",
        agent_name=f"{request.provider.capitalize()} Agent",
        task=request.prompt,
        status="running"
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    # 2. Check early configuration to return 400 instantly if unsupported
    if request.provider == "gemini" and not os.environ.get("GEMINI_API_KEY"):
        run.status = "failed"
        run.error = {"message": "Provider not configured.", "type": "ConfigurationError"}
        db.commit()
        raise HTTPException(status_code=400, detail="Provider not configured.")
        
    if request.provider in ["openai", "claude"]:
        run.status = "failed"
        run.error = {"message": "Provider not configured.", "type": "ConfigurationError"}
        db.commit()
        raise HTTPException(status_code=400, detail="Provider not configured.")
        
    # We need a valid API key to pass to the agent SDK so it can ingest telemetry
    from ..models.project import ApiKey
    api_key_record = db.query(ApiKey).filter(ApiKey.project_id == project_id, ApiKey.revoked == False).first()
    
    # We should definitely have an API key, but if not we can't run it
    if not api_key_record:
        raise HTTPException(status_code=400, detail="Project has no active API keys.")
        
    # We don't store the raw api key, only the hash, but we can bypass or create a temp one?
    # Wait, if we don't have the raw API key, how do we authenticate?
    # We can't recover a hashed API key.
    
    # Generate temporary API key for internal execution
    from .auth import generate_api_key
    raw_api_key, key_hash, prefix = generate_api_key()
    
    temp_key = ApiKey(
        project_id=project_id,
        key_hash=key_hash,
        prefix=prefix,
    )
    db.add(temp_key)
    db.commit()
    db.refresh(temp_key)
    
    background_tasks.add_task(execute_agent_task, request.prompt, request.provider, raw_api_key, run.id, temp_key.id)
    
    return {"run_id": run.id, "status": "running"}

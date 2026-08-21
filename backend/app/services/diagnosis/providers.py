import os
from abc import ABC, abstractmethod
from typing import Dict, Any, List
import json
from google import genai
from google.genai import types

class LLMProvider(ABC):
    @abstractmethod
    def generate_diagnosis(self, task: str, failed_step: Any, all_steps: List[Any]) -> Dict[str, Any]:
        """Generate a diagnosis dictionary."""
        pass

class DevelopmentDiagnosisProvider(LLMProvider):
    def generate_diagnosis(self, task: str, failed_step: Any, all_steps: List[Any]) -> Dict[str, Any]:
        print("Using DevelopmentDiagnosisProvider (deterministic analysis).")
        
        # Deterministic analysis of actual trace data
        error_msg = json.dumps(failed_step.error) if failed_step.error else "Unknown error"
        
        category = "Structural Error"
        root_cause = f"The step '{failed_step.name}' failed during execution."
        severity = "Medium"
        confidence = 1.0
        explanation = f"This is a Development Diagnosis (Structural Analysis).\n\nThe agent failed while executing task: '{task}'. Specifically, the step '{failed_step.name}' of type '{failed_step.step_type}' encountered an error."
        evidence = [
            f"Failed step ID: {failed_step.id}",
            f"Observed error: {error_msg}",
            f"Step execution order: {len(all_steps)} total steps"
        ]
        if failed_step.duration is not None:
            evidence.append(f"Step duration: {failed_step.duration:.2f}s")
            
        suggested_fixes = [
            "Check the inputs provided to this step.",
            "Verify that the required tools or APIs for this step are available."
        ]
        prevention_tips = [
            "Add error handling or retries for this specific step type.",
            "Ensure input validation before executing the step."
        ]
        
        # Determine some specifics deterministically based on error contents
        if "401" in error_msg or "unauthorized" in error_msg.lower():
            category = "Authentication"
            root_cause = "Authentication failure during step execution."
            evidence.append("Observed HTTP 401 or unauthorized keyword in error.")
            suggested_fixes.insert(0, "Verify authentication credentials (API keys, tokens).")
        elif "timeout" in error_msg.lower():
            category = "Timeout"
            root_cause = "The operation timed out."
            evidence.append("Observed timeout keyword in error.")
            
        return {
            "failure_category": category,
            "root_cause": root_cause,
            "severity": severity,
            "confidence_score": confidence,
            "explanation": explanation,
            "evidence": evidence,
            "suggested_fixes": suggested_fixes,
            "prevention_tips": prevention_tips,
            "technical_details": error_msg
        }

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        
    def generate_diagnosis(self, task: str, failed_step: Any, all_steps: List[Any]) -> Dict[str, Any]:
        trace_context = []
        for s in all_steps:
            trace_context.append({
                "id": s.id,
                "type": s.step_type,
                "name": s.name,
                "status": s.status,
                "input": s.input,
                "output": s.output,
                "error": s.error
            })
            
        prompt = f"""
        You are AgentLens, an expert AI Agent Failure Diagnosis Engine.
        Analyze the following execution trace of an AI agent and diagnose why it failed.
        
        CRITICAL RULES FOR DIAGNOSIS:
        1. Follow this hierarchy strictly: OBSERVED FACTS -> EVIDENCE -> LIKELY CAUSE -> CONFIDENCE -> SUGGESTED FIX.
        2. Never present speculation or inference as a confirmed fact. Maintain strict honesty about uncertainty.
        3. Distinguish OBSERVED EVIDENCE from AI INFERENCE.
        4. If there is insufficient evidence to determine the root cause, classify it as "Unknown / Insufficient Evidence".
        5. Do not hallucinate capabilities or hidden system prompts.
        
        Task: {task}
        Failed Step ID: {failed_step.id}
        Failed Step Name: {failed_step.name}
        Failed Step Type: {failed_step.step_type}
        Failed Step Error: {json.dumps(failed_step.error)}
        
        Full Trace Context:
        {json.dumps(trace_context, indent=2)}
        
        Provide a detailed, structured diagnosis following the exact schema.
        """
        
        response = self.client.models.generate_content(
            model='gemini-2.5-pro',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "failure_category": types.Schema(
                            type=types.Type.STRING,
                            description="One of: Tool Failure, Authentication, Rate Limit, Timeout, Network, Invalid Output, Hallucination, Context Overflow, Retrieval Failure, Logic Failure, Unknown"
                        ),
                        "root_cause": types.Schema(type=types.Type.STRING, description="A 1-sentence summary of the root cause."),
                        "severity": types.Schema(type=types.Type.STRING, description="Low, Medium, High, or Critical"),
                        "confidence_score": types.Schema(type=types.Type.NUMBER, description="Float between 0.0 and 1.0"),
                        "explanation": types.Schema(type=types.Type.STRING, description="Detailed explanation of what went wrong."),
                        "evidence": types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING),
                            description="Specific observed logs, inputs, or outputs that prove the diagnosis. Distinguish from inference."
                        ),
                        "suggested_fixes": types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING),
                            description="Actionable steps to fix the immediate issue."
                        ),
                        "prevention_tips": types.Schema(
                            type=types.Type.ARRAY,
                            items=types.Schema(type=types.Type.STRING),
                            description="Architectural or code changes to prevent this long-term."
                        ),
                        "technical_details": types.Schema(type=types.Type.STRING, description="Any deep technical details, stack traces, or API specifics.")
                    },
                    required=["failure_category", "root_cause", "severity", "confidence_score", "explanation", "evidence", "suggested_fixes", "prevention_tips"]
                ),
                temperature=0.2,
            ),
        )
        
        result_json = json.loads(response.text)
        return result_json

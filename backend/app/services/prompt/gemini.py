from .base import RefinementStrategy
from typing import Dict, Any, List

class GeminiStrategy(RefinementStrategy):
    def refine(self, original_prompt: str, context: str = None) -> Dict[str, Any]:
        changes = []
        refined = original_prompt.strip()
        quality_before = 60
        
        if "context" not in refined.lower() and "objective" not in refined.lower():
            refined = "Objective: [Preserve original intent here]\n\nContext: You are operating within an AI agent framework.\n\nTask: " + refined
            changes.append({
                "category": "Context & Objective",
                "what_changed": "Added explicit objective and context grounding",
                "why": "Gemini models perform exceptionally well when provided with explicit contextual grounding before the task."
            })
            quality_before -= 10
            
        if "format" not in refined.lower():
            refined += "\n\nConstraints: Follow all instructions strictly. Do not hallucinate capabilities.\nOutput Format: Provide a clearly structured response (e.g., JSON or Markdown)."
            changes.append({
                "category": "Constraints & Formatting",
                "what_changed": "Added structural constraints and output format requirements",
                "why": "Reduces ambiguity and forces the model to adhere to expected structures."
            })

        quality_after = min(100, quality_before + (len(changes) * 15))
        
        return {
            "refined_prompt": refined,
            "changes": changes,
            "quality_before": quality_before,
            "quality_after": quality_after
        }

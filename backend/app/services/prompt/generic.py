from .base import RefinementStrategy
from typing import Dict, Any, List

class GenericStrategy(RefinementStrategy):
    def refine(self, original_prompt: str, context: str = None) -> Dict[str, Any]:
        changes = []
        refined = original_prompt.strip()
        quality_before = 50
        
        if len(refined) < 30 or "objective" not in refined.lower():
            refined = "Objective: Complete the following task efficiently.\n\nTask: " + refined
            changes.append({
                "category": "Objective Definition",
                "what_changed": "Added explicit objective",
                "why": "Provides immediate clarity on the main goal, preserving the original intent."
            })
            quality_before = 30
            
        if "format" not in refined.lower() and "json" not in refined.lower():
            refined += "\n\nConstraints:\n- Handle edge cases gracefully.\n- Avoid making assumptions.\n\nOutput Format: Format your output clearly, using markdown where appropriate."
            changes.append({
                "category": "Constraints & Formatting",
                "what_changed": "Added ambiguity reduction and output format",
                "why": "Specifying an output format and constraints prevents unstructured or difficult-to-parse responses."
            })

        quality_after = min(100, quality_before + (len(changes) * 15))
        
        return {
            "refined_prompt": refined,
            "changes": changes,
            "quality_before": quality_before,
            "quality_after": quality_after
        }

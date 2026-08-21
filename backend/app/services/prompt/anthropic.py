from .base import RefinementStrategy
from typing import Dict, Any, List

class AnthropicStrategy(RefinementStrategy):
    def refine(self, original_prompt: str, context: str = None) -> Dict[str, Any]:
        changes = []
        refined = original_prompt.strip()
        quality_before = 60
        
        if "<objective>" not in refined.lower():
            refined = f"<objective>\n[Preserve original intent here]\n</objective>\n\n<context>\nYou are operating within an AI agent framework.\n</context>\n\n<instructions>\n{refined}\n</instructions>"
            changes.append({
                "category": "Structure & Objective",
                "what_changed": "Wrapped intent, context, and instructions in XML tags",
                "why": "Claude models are trained to pay special attention to instructions enclosed in XML tags."
            })
            quality_before -= 10
            
        if "skip" not in refined.lower() and "direct" not in refined.lower():
            refined += "\n\n<constraints>\n- Provide the final response directly without conversational filler like 'Here is the answer'.\n- Do not hallucinate capabilities.\n</constraints>"
            changes.append({
                "category": "Constraints & Output Format",
                "what_changed": "Added constraints against conversational filler",
                "why": "Claude tends to be overly polite; explicitly asking to skip preamble improves output parsing."
            })

        quality_after = min(100, quality_before + (len(changes) * 15))
        
        return {
            "refined_prompt": refined,
            "changes": changes,
            "quality_before": quality_before,
            "quality_after": quality_after
        }

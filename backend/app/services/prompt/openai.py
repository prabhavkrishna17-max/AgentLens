from .base import RefinementStrategy
from typing import Dict, Any, List

class OpenAIStrategy(RefinementStrategy):
    def refine(self, original_prompt: str, context: str = None) -> Dict[str, Any]:
        changes = []
        refined = original_prompt.strip()
        quality_before = 60
        
        if "system:" not in refined.lower():
            refined = "System: You are an expert AI assistant tasked with a specific objective: [Preserve original intent here]. You are operating within an AI agent framework.\n\nUser: " + refined
            changes.append({
                "category": "Role & Objective",
                "what_changed": "Added explicit System role with objective",
                "why": "OpenAI models (like ChatGPT) follow instructions better when role-play and context are placed in a System message."
            })
            quality_before -= 10
            
        if "step" not in refined.lower():
            refined += "\n\nConstraints:\n- Think through this step-by-step before providing the final answer.\n- Strictly format your output to avoid parsing errors.\n- Do not assume missing information."
            changes.append({
                "category": "Constraints & Reasoning",
                "what_changed": "Added step-by-step reasoning constraint and explicit boundaries",
                "why": "Encouraging chain-of-thought helps GPT models avoid logical errors."
            })

        quality_after = min(100, quality_before + (len(changes) * 20))
        
        return {
            "refined_prompt": refined,
            "changes": changes,
            "quality_before": quality_before,
            "quality_after": quality_after
        }

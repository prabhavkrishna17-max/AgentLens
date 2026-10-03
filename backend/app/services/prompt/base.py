from abc import ABC, abstractmethod
from typing import Dict, Any, List

class RefinementStrategy(ABC):
    @abstractmethod
    def refine(self, original_prompt: str, context: str = None) -> Dict[str, Any]:
        """
        Returns a dictionary containing:
        - refined_prompt: str
        - changes: List[Dict] (category, what_changed, why)
        - quality_before: int
        - quality_after: int
        """
        pass

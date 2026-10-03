from .base import RefinementStrategy
from .generic import GenericStrategy
from .openai import OpenAIStrategy
from .anthropic import AnthropicStrategy
from .gemini import GeminiStrategy

_strategies = {
    "generic": GenericStrategy(),
    "openai": OpenAIStrategy(),
    "chatgpt": OpenAIStrategy(),
    "anthropic": AnthropicStrategy(),
    "claude": AnthropicStrategy(),
    "gemini": GeminiStrategy(),
    "google": GeminiStrategy(),
}

def get_strategy(model_name: str) -> RefinementStrategy:
    normalized = model_name.lower().strip()
    return _strategies.get(normalized, _strategies["generic"])

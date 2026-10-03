import functools
import logging
from typing import Any

logger = logging.getLogger("agentlens")

_original_create = None
_original_async_create = None

def instrument_openai(lens: Any):
    """
    Instruments the OpenAI SDK to automatically record chat completions as AgentLens LLM steps.
    Pass in the AgentLens client instance.
    """
    global _original_create, _original_async_create
    try:
        import openai
        from openai.resources.chat.completions import Completions, AsyncCompletions
    except ImportError:
        logger.warning("[AgentLens] OpenAI SDK not found. Skipping instrumentation.")
        return

    if _original_create is not None:
        logger.warning("[AgentLens] OpenAI already instrumented.")
        return

    _original_create = Completions.create
    _original_async_create = AsyncCompletions.create

    @functools.wraps(_original_create)
    def wrapped_create(self, *args, **kwargs):
        # We only capture if there's an active run
        from ..context import get_current_run
        run = get_current_run()
        if not run:
            return _original_create(self, *args, **kwargs)

        input_data = kwargs.copy()
        model = input_data.get("model", "unknown")
        
        metadata = {
            "provider": "openai",
            "model": model,
            "operation": "chat.completions.create"
        }
        
        # Redact messages if needed? Actually we respect capture_inputs inside the client, 
        # but the wrapper directly uses run.llm. We should check lens.capture_inputs
        if not lens.capture_inputs:
            input_data = {"redacted": True}

        with run.llm(name=f"OpenAI: {model}", input_data=input_data, metadata=metadata) as step:
            result = _original_create(self, *args, **kwargs)
            
            output_data = {}
            if lens.capture_outputs:
                if hasattr(result, "model_dump"):
                    output_data = result.model_dump()
                else:
                    output_data = {"role": "assistant", "content": "Unable to serialize response"}
                    
            if hasattr(result, "usage") and result.usage:
                step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(result.usage, "prompt_tokens", 0),
                    "completion_tokens": getattr(result.usage, "completion_tokens", 0),
                    "total_tokens": getattr(result.usage, "total_tokens", 0)
                }

            step.set_output(output_data)
            return result

    @functools.wraps(_original_async_create)
    async def async_wrapped_create(self, *args, **kwargs):
        from ..context import get_current_run
        run = get_current_run()
        if not run:
            return await _original_async_create(self, *args, **kwargs)

        input_data = kwargs.copy()
        model = input_data.get("model", "unknown")
        
        metadata = {
            "provider": "openai",
            "model": model,
            "operation": "chat.completions.create"
        }
        
        if not lens.capture_inputs:
            input_data = {"redacted": True}

        async with run.llm(name=f"OpenAI: {model}", input_data=input_data, metadata=metadata) as step:
            result = await _original_async_create(self, *args, **kwargs)
            
            output_data = {}
            if lens.capture_outputs:
                if hasattr(result, "model_dump"):
                    output_data = result.model_dump()
                else:
                    output_data = {"role": "assistant", "content": "Unable to serialize response"}
                    
            if hasattr(result, "usage") and result.usage:
                step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(result.usage, "prompt_tokens", 0),
                    "completion_tokens": getattr(result.usage, "completion_tokens", 0),
                    "total_tokens": getattr(result.usage, "total_tokens", 0)
                }

            step.set_output(output_data)
            return result

    Completions.create = wrapped_create
    AsyncCompletions.create = async_wrapped_create
    logger.info("[AgentLens] OpenAI SDK instrumented.")


def uninstrument_openai():
    """Removes the AgentLens instrumentation from the OpenAI SDK."""
    global _original_create, _original_async_create
    try:
        from openai.resources.chat.completions import Completions, AsyncCompletions
    except ImportError:
        return

    if _original_create is not None:
        Completions.create = _original_create
        _original_create = None
    if _original_async_create is not None:
        AsyncCompletions.create = _original_async_create
        _original_async_create = None
        
    logger.info("[AgentLens] OpenAI SDK uninstrumented.")

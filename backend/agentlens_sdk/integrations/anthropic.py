import functools
import logging
from typing import Any

logger = logging.getLogger("agentlens")

_original_create = None
_original_async_create = None

def instrument_anthropic(lens: Any):
    """
    Instruments the Anthropic SDK to automatically record message creation as AgentLens LLM steps.
    """
    global _original_create, _original_async_create
    try:
        import anthropic
        from anthropic.resources.messages import Messages, AsyncMessages
    except ImportError:
        logger.warning("[AgentLens] Anthropic SDK not found. Skipping instrumentation.")
        return

    if _original_create is not None:
        logger.warning("[AgentLens] Anthropic already instrumented.")
        return

    _original_create = Messages.create
    _original_async_create = AsyncMessages.create

    @functools.wraps(_original_create)
    def wrapped_create(self, *args, **kwargs):
        from ..context import get_current_run
        run = get_current_run()
        if not run:
            return _original_create(self, *args, **kwargs)

        input_data = kwargs.copy()
        model = input_data.get("model", "unknown")
        
        metadata = {
            "provider": "anthropic",
            "model": model,
            "operation": "messages.create"
        }
        
        if not lens.capture_inputs:
            input_data = {"redacted": True}

        with run.llm(name=f"Claude: {model}", input_data=input_data, metadata=metadata) as step:
            result = _original_create(self, *args, **kwargs)
            
            output_data = {}
            if lens.capture_outputs:
                if hasattr(result, "model_dump"):
                    output_data = result.model_dump()
                else:
                    output_data = {"role": "assistant", "content": "Unable to serialize response"}
                    
            if hasattr(result, "usage") and result.usage:
                step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(result.usage, "input_tokens", 0),
                    "completion_tokens": getattr(result.usage, "output_tokens", 0),
                    "total_tokens": getattr(result.usage, "input_tokens", 0) + getattr(result.usage, "output_tokens", 0)
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
            "provider": "anthropic",
            "model": model,
            "operation": "messages.create"
        }
        
        if not lens.capture_inputs:
            input_data = {"redacted": True}

        async with run.llm(name=f"Claude: {model}", input_data=input_data, metadata=metadata) as step:
            result = await _original_async_create(self, *args, **kwargs)
            
            output_data = {}
            if lens.capture_outputs:
                if hasattr(result, "model_dump"):
                    output_data = result.model_dump()
                else:
                    output_data = {"role": "assistant", "content": "Unable to serialize response"}
                    
            if hasattr(result, "usage") and result.usage:
                step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(result.usage, "input_tokens", 0),
                    "completion_tokens": getattr(result.usage, "output_tokens", 0),
                    "total_tokens": getattr(result.usage, "input_tokens", 0) + getattr(result.usage, "output_tokens", 0)
                }

            step.set_output(output_data)
            return result

    Messages.create = wrapped_create
    AsyncMessages.create = async_wrapped_create
    logger.info("[AgentLens] Anthropic SDK instrumented.")


def uninstrument_anthropic():
    global _original_create, _original_async_create
    try:
        from anthropic.resources.messages import Messages, AsyncMessages
    except ImportError:
        return

    if _original_create is not None:
        Messages.create = _original_create
        _original_create = None
    if _original_async_create is not None:
        AsyncMessages.create = _original_async_create
        _original_async_create = None
        
    logger.info("[AgentLens] Anthropic SDK uninstrumented.")

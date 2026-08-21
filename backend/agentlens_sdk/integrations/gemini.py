import functools
import logging
from typing import Any

logger = logging.getLogger("agentlens")

_original_generate = None
_original_async_generate = None

def instrument_gemini(lens: Any):
    """
    Instruments the Google Generative AI SDK to automatically record content generation as AgentLens LLM steps.
    """
    global _original_generate, _original_async_generate
    try:
        import google.generativeai as genai
        from google.generativeai import GenerativeModel
    except ImportError:
        logger.warning("[AgentLens] google.generativeai SDK not found. Skipping instrumentation.")
        return

    if _original_generate is not None:
        logger.warning("[AgentLens] Gemini already instrumented.")
        return

    _original_generate = GenerativeModel.generate_content
    _original_async_generate = GenerativeModel.generate_content_async

    @functools.wraps(_original_generate)
    def wrapped_generate(self, *args, **kwargs):
        from ..context import get_current_run
        run = get_current_run()
        if not run:
            return _original_generate(self, *args, **kwargs)

        model_name = self.model_name
        
        metadata = {
            "provider": "google",
            "model": model_name,
            "operation": "generate_content"
        }
        
        input_data = {"args": args, "kwargs": kwargs}
        if not lens.capture_inputs:
            input_data = {"redacted": True}

        with run.llm(name=f"Gemini: {model_name}", input_data=input_data, metadata=metadata) as step:
            result = _original_generate(self, *args, **kwargs)
            
            output_data = {}
            if lens.capture_outputs:
                try:
                    output_data = {"text": result.text}
                except Exception:
                    output_data = {"status": "success", "note": "Could not extract text"}
                    
            if hasattr(result, "usage_metadata") and result.usage_metadata:
                step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(result.usage_metadata, "prompt_token_count", 0),
                    "completion_tokens": getattr(result.usage_metadata, "candidates_token_count", 0),
                    "total_tokens": getattr(result.usage_metadata, "total_token_count", 0)
                }

            step.set_output(output_data)
            return result

    @functools.wraps(_original_async_generate)
    async def async_wrapped_generate(self, *args, **kwargs):
        from ..context import get_current_run
        run = get_current_run()
        if not run:
            return await _original_async_generate(self, *args, **kwargs)

        model_name = self.model_name
        
        metadata = {
            "provider": "google",
            "model": model_name,
            "operation": "generate_content_async"
        }
        
        input_data = {"args": args, "kwargs": kwargs}
        if not lens.capture_inputs:
            input_data = {"redacted": True}

        async with run.llm(name=f"Gemini: {model_name}", input_data=input_data, metadata=metadata) as step:
            result = await _original_async_generate(self, *args, **kwargs)
            
            output_data = {}
            if lens.capture_outputs:
                try:
                    output_data = {"text": result.text}
                except Exception:
                    output_data = {"status": "success", "note": "Could not extract text"}
                    
            if hasattr(result, "usage_metadata") and result.usage_metadata:
                step.metadata["token_usage"] = {
                    "prompt_tokens": getattr(result.usage_metadata, "prompt_token_count", 0),
                    "completion_tokens": getattr(result.usage_metadata, "candidates_token_count", 0),
                    "total_tokens": getattr(result.usage_metadata, "total_token_count", 0)
                }

            step.set_output(output_data)
            return result

    GenerativeModel.generate_content = wrapped_generate
    GenerativeModel.generate_content_async = async_wrapped_generate
    logger.info("[AgentLens] Gemini SDK instrumented.")


def uninstrument_gemini():
    global _original_generate, _original_async_generate
    try:
        from google.generativeai import GenerativeModel
    except ImportError:
        return

    if _original_generate is not None:
        GenerativeModel.generate_content = _original_generate
        _original_generate = None
    if _original_async_generate is not None:
        GenerativeModel.generate_content_async = _original_async_generate
        _original_async_generate = None
        
    logger.info("[AgentLens] Gemini SDK uninstrumented.")

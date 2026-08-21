import functools
import inspect
from typing import Optional, Dict, Any, Callable
from .transport import HttpTransport
from .run import RunContext
from .context import get_current_run

# Global registry for active lens (mostly used by decorators)
_global_lens_instance = None

MAX_STRING_LENGTH = 10000
MAX_LIST_LENGTH = 100
MAX_DEPTH = 5
SENSITIVE_KEYS = {"password", "api_key", "apikey", "secret", "token", "authorization", "access_token", "refresh_token", "client_secret"}

def redact_sensitive_data(data: Any, depth: int = 0) -> Any:
    """Deep redaction for sensitive keys and payload truncation."""
    if depth > MAX_DEPTH:
        return "[TRUNCATED - MAX DEPTH REACHED]"
        
    if isinstance(data, dict):
        result = {}
        for k, v in data.items():
            if isinstance(k, str) and any(s in k.lower() for s in SENSITIVE_KEYS):
                result[k] = "[REDACTED]"
            else:
                result[k] = redact_sensitive_data(v, depth + 1)
        return result
    elif isinstance(data, (list, tuple, set)):
        items = list(data)
        if len(items) > MAX_LIST_LENGTH:
            return [redact_sensitive_data(item, depth + 1) for item in items[:MAX_LIST_LENGTH]] + [f"[TRUNCATED - {len(items) - MAX_LIST_LENGTH} ITEMS OMITTED]"]
        return [redact_sensitive_data(item, depth + 1) for item in items]
    elif isinstance(data, str):
        if len(data) > MAX_STRING_LENGTH:
            return data[:MAX_STRING_LENGTH] + f"... [TRUNCATED - ORIGINAL EXCEEDED {MAX_STRING_LENGTH} CHARS]"
        return data
    return data

class AgentLens:
    """
    Observability SDK for AgentLens.
    """
    def __init__(
        self, 
        api_key: str, 
        base_url: str = "http://localhost:8000",
        capture_inputs: bool = True,
        capture_outputs: bool = True,
        telemetry_enabled: bool = True
    ):
        self.transport = HttpTransport(api_key=api_key, base_url=base_url, enabled=telemetry_enabled)
        self.capture_inputs = capture_inputs
        self.capture_outputs = capture_outputs
        
        global _global_lens_instance
        _global_lens_instance = self

    def run(self, agent_name: str, task: str, environment: str = "development", metadata: Optional[Dict[str, Any]] = None) -> RunContext:
        """
        Context manager to track an entire agent execution run.
        """
        return RunContext(transport=self.transport, agent_name=agent_name, task=task, environment=environment, metadata=metadata)

    def tool(self, name: Optional[str] = None):
        """
        Decorator to automatically capture a tool function's execution.
        """
        def decorator(func: Callable):
            tool_name = name or func.__name__
            
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                run = get_current_run()
                if not run:
                    return func(*args, **kwargs)
                
                input_data = {}
                if self.capture_inputs:
                    try:
                        sig = inspect.signature(func)
                        bound_args = sig.bind(*args, **kwargs)
                        bound_args.apply_defaults()
                        input_data = redact_sensitive_data(dict(bound_args.arguments))
                    except Exception as e:
                        import logging
                        logging.getLogger("agentlens").warning(f"Failed to capture inputs: {e}")
                
                with run.tool(name=tool_name, input_data=input_data) as step:
                    result = func(*args, **kwargs)
                    if self.capture_outputs:
                        try:
                            step.set_output(redact_sensitive_data(result))
                        except Exception as e:
                            import logging
                            logging.getLogger("agentlens").warning(f"Failed to capture outputs: {e}")
                    return result

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                run = get_current_run()
                if not run:
                    return await func(*args, **kwargs)
                    
                input_data = {}
                if self.capture_inputs:
                    try:
                        sig = inspect.signature(func)
                        bound_args = sig.bind(*args, **kwargs)
                        bound_args.apply_defaults()
                        input_data = redact_sensitive_data(dict(bound_args.arguments))
                    except Exception as e:
                        import logging
                        logging.getLogger("agentlens").warning(f"Failed to capture async inputs: {e}")
                
                async with run.tool(name=tool_name, input_data=input_data) as step:
                    result = await func(*args, **kwargs)
                    if self.capture_outputs:
                        try:
                            step.set_output(redact_sensitive_data(result))
                        except Exception as e:
                            import logging
                            logging.getLogger("agentlens").warning(f"Failed to capture async outputs: {e}")
                    return result
                    
            if inspect.iscoroutinefunction(func):
                return async_wrapper
            return sync_wrapper
        return decorator

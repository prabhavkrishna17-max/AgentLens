from contextvars import ContextVar
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from .run import RunContext
    from .step import StepContext

# Thread-safe and async-safe context variables
current_run_var: ContextVar[Optional['RunContext']] = ContextVar('current_run', default=None)
current_step_var: ContextVar[Optional['StepContext']] = ContextVar('current_step', default=None)

def get_current_run() -> Optional['RunContext']:
    return current_run_var.get()

def get_current_step() -> Optional['StepContext']:
    return current_step_var.get()

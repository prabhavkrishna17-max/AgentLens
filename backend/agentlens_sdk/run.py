import datetime
from typing import Optional, Any, Dict, List
from .transport import HttpTransport
from .step import StepContext
from .context import current_run_var
import logging

logger = logging.getLogger("agentlens")

class RunContext:
    """Represents a single execution run for an agent."""
    def __init__(
        self, 
        transport: HttpTransport, 
        agent_name: str,
        task: str, 
        environment: str = "development",
        metadata: Optional[Dict[str, Any]] = None,
        run_id: Optional[str] = None
    ):
        self.transport = transport
        self.agent_name = agent_name
        self.task = task
        self.environment = environment
        self.metadata = metadata or {}
        
        self.id: Optional[str] = run_id
        self.started_at: Optional[datetime.datetime] = None
        self._token: Optional[Any] = None

    def __enter__(self):
        self.started_at = datetime.datetime.now(datetime.timezone.utc)
        if not self.id:
            payload = {
                "agent_name": self.agent_name,
                "task": self.task,
                "environment": self.environment,
                "metadata": self.metadata
            }
            resp = self.transport.post("/api/v1/ingest/runs", payload)
            if resp and "id" in resp:
                self.id = resp["id"]
        
        self._token = current_run_var.set(self)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._token is not None:
            current_run_var.reset(self._token)
            self._token = None
            
        if not self.id:
            return False
            
        completed_at = datetime.datetime.now(datetime.timezone.utc)
        duration = (completed_at - self.started_at).total_seconds() if self.started_at else 0
        
        payload = {
            "completed_at": completed_at.isoformat(),
            "duration": duration
        }
        
        if exc_type:
            payload["status"] = "failed"
            error_msg = str(exc_val)
            if len(error_msg) > 10000:
                error_msg = error_msg[:10000] + "... [TRUNCATED - EXCEEDED 10000 CHARS]"
            payload["error"] = {"message": error_msg, "type": exc_type.__name__}
        else:
            payload["status"] = "completed"
            
        self.transport.patch(f"/api/v1/ingest/runs/{self.id}", payload)
        return False # Do not swallow the exception

    async def __aenter__(self):
        return self.__enter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return self.__exit__(exc_type, exc_val, exc_tb)

    def step(self, name: str, step_type: str, input_data: Any = None, metadata: Optional[Dict[str, Any]] = None) -> StepContext:
        """Context manager to record a step within this run."""
        from .context import get_current_step
        parent_step = get_current_step()
        parent_id = parent_step.id if parent_step else None
        
        return StepContext(
            self.transport, 
            run_id=self.id, 
            name=name, 
            step_type=step_type, 
            parent_id=parent_id, 
            input_data=input_data,
            metadata=metadata
        )

    def llm(self, name: str = "LLM Call", input_data: Any = None, metadata: Optional[Dict[str, Any]] = None) -> StepContext:
        return self.step(name=name, step_type="LLM", input_data=input_data, metadata=metadata)
        
    def tool(self, name: str = "Tool Call", input_data: Any = None, metadata: Optional[Dict[str, Any]] = None) -> StepContext:
        return self.step(name=name, step_type="TOOL", input_data=input_data, metadata=metadata)
        
    def retrieval(self, name: str = "Retrieval", input_data: Any = None, metadata: Optional[Dict[str, Any]] = None) -> StepContext:
        return self.step(name=name, step_type="RETRIEVAL", input_data=input_data, metadata=metadata)

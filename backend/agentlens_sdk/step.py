import datetime
from typing import Optional, Any, Dict
from .transport import HttpTransport
from .context import current_step_var
import logging

logger = logging.getLogger("agentlens")

class StepContext:
    """Represents a single execution step within a run."""
    def __init__(
        self, 
        transport: HttpTransport, 
        run_id: str, 
        name: str, 
        step_type: str, 
        parent_id: Optional[str] = None,
        input_data: Any = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.transport = transport
        self.run_id = run_id
        self.name = name
        self.step_type = step_type
        self.parent_id = parent_id
        self.input_data = input_data
        self.metadata = metadata or {}
        
        self.id: Optional[str] = None
        self.started_at: Optional[datetime.datetime] = None
        self._token: Optional[Any] = None

    def __enter__(self):
        self.started_at = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            "run_id": self.run_id,
            "parent_id": self.parent_id,
            "type": self.step_type,
            "name": self.name,
            "input": self.input_data,
            "metadata": self.metadata
        }
        resp = self.transport.post("/api/v1/ingest/steps", payload)
        if resp and "id" in resp:
            self.id = resp["id"]
        
        self._token = current_step_var.set(self)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._token is not None:
            current_step_var.reset(self._token)
            self._token = None
            
        if not self.id:
            return False # We failed to create the step, just swallow the error so user code continues
            
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
            
        self.transport.patch(f"/api/v1/ingest/steps/{self.id}", payload)
        
        return False # Do not swallow the exception for the actual agent logic!
        
    async def __aenter__(self):
        return self.__enter__()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return self.__exit__(exc_type, exc_val, exc_tb)
        
    def set_output(self, output_data: Any):
        """Update the step with its output data before it finishes."""
        if not self.id:
            return
        self.transport.patch(f"/api/v1/ingest/steps/{self.id}", {"output": output_data})

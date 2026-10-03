import requests
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("agentlens")

class HttpTransport:
    """Handles HTTP communication with the AgentLens API."""
    def __init__(self, api_key: str, base_url: str, enabled: bool = True):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.enabled = enabled
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def post(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None
        try:
            url = f"{self.base_url}{endpoint}"
            response = requests.post(url, json=payload, headers=self.headers, timeout=5.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"[AgentLens] Failed to POST {endpoint}: {e}")
            return None

    def patch(self, endpoint: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.enabled:
            return None
        try:
            url = f"{self.base_url}{endpoint}"
            response = requests.patch(url, json=payload, headers=self.headers, timeout=5.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"[AgentLens] Failed to PATCH {endpoint}: {e}")
            return None

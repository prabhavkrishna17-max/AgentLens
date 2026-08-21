class AgentLensException(Exception):
    """Base exception for AgentLens SDK."""
    pass

class TransportError(AgentLensException):
    """Raised when communication with the AgentLens API fails."""
    pass

class AuthenticationError(AgentLensException):
    """Raised when the API key is invalid."""
    pass

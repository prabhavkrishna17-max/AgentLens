from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import hashlib
import secrets

from app.core.db import get_db
from app.models.project import ApiKey, Project

security = HTTPBearer()

def generate_api_key():
    """Generates a secure API key and its hash."""
    raw_secret = secrets.token_urlsafe(32)
    api_key = f"al_{raw_secret}"
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    prefix = api_key[:8]
    return api_key, key_hash, prefix

def verify_api_key(plain_api_key: str, hashed_key: str) -> bool:
    return hashlib.sha256(plain_api_key.encode()).hexdigest() == hashed_key

def get_current_project(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Project:
    """
    Dependency to authenticate the API key and return the associated Project.
    """
    token = credentials.credentials
    if not token.startswith("al_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format.",
        )
    
    prefix = token[:8]
    
    # Fast lookup by prefix
    api_keys = db.query(ApiKey).filter(ApiKey.prefix == prefix, ApiKey.revoked == False).all()
    
    for key_record in api_keys:
        if verify_api_key(token, key_record.key_hash):
            return key_record.project
            
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or revoked API key.",
    )

"""
Security Utilities
Password hashing, JWT token generation, and authentication helpers
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Password policy (FR-AUTH-03)
PASSWORD_MIN_LENGTH = 8
PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 8 characters and include an uppercase letter, "
    "a lowercase letter, and a digit"
)


def validate_password_strength(password: str) -> str:
    """
    Enforce the password policy.

    Args:
        password: Plain text password

    Returns:
        The password unchanged if it is valid

    Raises:
        ValueError: If the password does not meet the policy
    """
    if (
        len(password) < PASSWORD_MIN_LENGTH
        or not re.search(r"[A-Z]", password)
        or not re.search(r"[a-z]", password)
        or not re.search(r"\d", password)
    ):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    return password


def reject_mongo_operators(value: Any) -> Any:
    """
    Reject user-supplied data containing MongoDB operator keys (NFR-SEC-04).

    Recursively checks dictionaries and lists for keys starting with '$'
    or containing '.', which could be used for operator injection.

    Args:
        value: Data to check

    Returns:
        The value unchanged if it is safe

    Raises:
        ValueError: If an operator-like key is found
    """
    if isinstance(value, dict):
        for key, item in value.items():
            if not isinstance(key, str) or key.startswith("$") or "." in key:
                raise ValueError(f"Invalid field name: {key!r}")
            reject_mongo_operators(item)
    elif isinstance(value, list):
        for item in value:
            reject_mongo_operators(item)
    return value


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password to verify against
        
    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional expiration time delta
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT access token
    
    Args:
        token: JWT token to decode
        
    Returns:
        Decoded token data or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        # Never log the token or secret key
        logger.warning(f"JWT decode error: {e}")
        return None

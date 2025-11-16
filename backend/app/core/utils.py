"""
Utility Functions
Common helper functions used across the application
"""

import uuid
from typing import Any, Dict
from datetime import datetime


def generate_uuid(prefix: str = "") -> str:
    """
    Generate a unique ID with optional prefix
    
    Args:
        prefix: Optional prefix for the UUID
        
    Returns:
        Generated UUID string
    """
    unique_id = uuid.uuid4().hex[:8]
    return f"{prefix}_{unique_id}" if prefix else unique_id


def get_current_timestamp() -> str:
    """
    Get current timestamp in ISO format
    
    Returns:
        Current timestamp string
    """
    return datetime.now().isoformat()


def sanitize_dict(data: Dict[str, Any], exclude_keys: list = None) -> Dict[str, Any]:
    """
    Remove specified keys from a dictionary
    
    Args:
        data: Dictionary to sanitize
        exclude_keys: List of keys to remove
        
    Returns:
        Sanitized dictionary
    """
    if exclude_keys is None:
        exclude_keys = ["password", "_id"]
    
    return {k: v for k, v in data.items() if k not in exclude_keys}


def format_error_response(error: Exception) -> Dict[str, Any]:
    """
    Format exception into error response
    
    Args:
        error: Exception to format
        
    Returns:
        Formatted error dictionary
    """
    return {
        "success": False,
        "error": str(error),
        "type": type(error).__name__
    }

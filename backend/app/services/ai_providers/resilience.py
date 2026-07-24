"""
Resilience & Decorator Pattern for AI Providers
Handles retries, exponential backoff, and error handling.
"""

import time
import functools
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

def with_retry_and_backoff(max_retries: int = 3, initial_delay: float = 1.0, backoff_factor: float = 2.0):
    """
    Decorator that retries a function with exponential backoff if an exception is raised.
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = initial_delay
            last_exception = None

            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    logger.warning(
                        f"⚠️ Exception in {func.__name__} (Attempt {attempt}/{max_retries}): {e}"
                    )
                    if attempt < max_retries:
                        time.sleep(delay)
                        delay *= backoff_factor
            
            logger.error(f"❌ All {max_retries} attempts failed for {func.__name__}. Error: {last_exception}")
            raise last_exception  # Re-raise to trigger fallback handler in provider chain

        return wrapper
    return decorator

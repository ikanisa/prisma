"""
Supabase client helper for backend services
Provides a singleton client for database operations
"""
import os
from typing import Optional
from functools import lru_cache
from supabase import create_client, Client
import structlog

logger = structlog.get_logger().bind(component="supabase_client")

_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create a Supabase client instance.
    Uses service role key for backend operations.
    
    Returns:
        Supabase client configured with service role credentials
    
    Raises:
        RuntimeError: If required environment variables are missing
    """
    global _client
    
    if _client is not None:
        return _client
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        logger.error(
            "supabase_client_missing_config",
            has_url=bool(url),
            has_key=bool(key)
        )
        raise RuntimeError(
            "Missing required environment variables: "
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
        )
    
    _client = create_client(url, key)
    logger.info("supabase_client_initialized", url=url[:30] + "...")
    
    return _client


def reset_client() -> None:
    """Reset the client (useful for testing)"""
    global _client
    _client = None

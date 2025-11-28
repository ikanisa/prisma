"""
Database Service - Supabase Integration

Provides a unified interface for database operations using Supabase.
Handles connection pooling, RLS policy enforcement, and query execution.
"""

import os
from typing import Any, Dict, List, Optional
import httpx
from functools import lru_cache
import structlog

logger = structlog.get_logger(__name__)


class DatabaseService:
    """Database service for Supabase operations."""
    
    def __init__(self, supabase_url: Optional[str] = None, supabase_key: Optional[str] = None):
        """
        Initialize database service.
        
        Args:
            supabase_url: Supabase project URL (defaults to env var)
            supabase_key: Supabase service role key (defaults to env var)
        """
        self.supabase_url = supabase_url or os.getenv("SUPABASE_URL")
        self.supabase_key = supabase_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.supabase_url:
            raise ValueError("SUPABASE_URL environment variable is required")
        if not self.supabase_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable is required")
        
        self.base_url = f"{self.supabase_url}/rest/v1"
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        # HTTP client with connection pooling
        self.client = httpx.AsyncClient(
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
        )
        
        logger.info("database_service_initialized", url=self.supabase_url)
    
    async def query(
        self,
        table: str,
        select: str = "*",
        filters: Optional[Dict[str, Any]] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Query records from a table.
        
        Args:
            table: Table name
            select: Columns to select (default: "*")
            filters: Filter conditions (eq, neq, gt, gte, lt, lte, like, ilike)
            order: Order by clause (e.g., "created_at.desc")
            limit: Maximum number of records
            offset: Number of records to skip
            
        Returns:
            List of records as dictionaries
        """
        url = f"{self.base_url}/{table}"
        params = {"select": select}
        
        # Add filters
        if filters:
            for key, value in filters.items():
                if isinstance(value, dict):
                    # Support operators like {"eq": value}, {"gt": value}
                    op, val = next(iter(value.items()))
                    params[key] = f"{op}.{val}"
                else:
                    # Default to exact match
                    params[key] = f"eq.{value}"
        
        # Add order
        if order:
            params["order"] = order
        
        # Add limit and offset
        if limit:
            params["limit"] = str(limit)
        if offset:
            params["offset"] = str(offset)
        
        try:
            response = await self.client.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            
            logger.debug(
                "database_query_success",
                table=table,
                filters=filters,
                count=len(response.json())
            )
            
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                "database_query_failed",
                table=table,
                status_code=e.response.status_code,
                error=str(e)
            )
            raise
    
    async def insert(
        self,
        table: str,
        data: Dict[str, Any] | List[Dict[str, Any]],
        upsert: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Insert record(s) into a table.
        
        Args:
            table: Table name
            data: Record or list of records to insert
            upsert: If True, update on conflict (default: False)
            
        Returns:
            List of inserted records
        """
        url = f"{self.base_url}/{table}"
        headers = self.headers.copy()
        
        if upsert:
            headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        
        try:
            response = await self.client.post(url, json=data, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            logger.info(
                "database_insert_success",
                table=table,
                count=len(result) if isinstance(result, list) else 1
            )
            
            return result
        except httpx.HTTPStatusError as e:
            logger.error(
                "database_insert_failed",
                table=table,
                status_code=e.response.status_code,
                error=str(e)
            )
            raise
    
    async def update(
        self,
        table: str,
        filters: Dict[str, Any],
        data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Update records in a table.
        
        Args:
            table: Table name
            filters: Filter conditions to identify records
            data: Updated field values
            
        Returns:
            List of updated records
        """
        url = f"{self.base_url}/{table}"
        params = {}
        
        # Add filters
        for key, value in filters.items():
            if isinstance(value, dict):
                op, val = next(iter(value.items()))
                params[key] = f"{op}.{val}"
            else:
                params[key] = f"eq.{value}"
        
        try:
            response = await self.client.patch(url, params=params, json=data, headers=self.headers)
            response.raise_for_status()
            
            result = response.json()
            logger.info(
                "database_update_success",
                table=table,
                filters=filters,
                count=len(result) if isinstance(result, list) else 1
            )
            
            return result
        except httpx.HTTPStatusError as e:
            logger.error(
                "database_update_failed",
                table=table,
                status_code=e.response.status_code,
                error=str(e)
            )
            raise
    
    async def delete(self, table: str, filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Delete records from a table.
        
        Args:
            table: Table name
            filters: Filter conditions to identify records
            
        Returns:
            List of deleted records
        """
        url = f"{self.base_url}/{table}"
        params = {}
        
        # Add filters
        for key, value in filters.items():
            if isinstance(value, dict):
                op, val = next(iter(value.items()))
                params[key] = f"{op}.{val}"
            else:
                params[key] = f"eq.{value}"
        
        try:
            response = await self.client.delete(url, params=params, headers=self.headers)
            response.raise_for_status()
            
            result = response.json()
            logger.info(
                "database_delete_success",
                table=table,
                filters=filters,
                count=len(result) if isinstance(result, list) else 1
            )
            
            return result
        except httpx.HTTPStatusError as e:
            logger.error(
                "database_delete_failed",
                table=table,
                status_code=e.response.status_code,
                error=str(e)
            )
            raise
    
    async def close(self):
        """Close database connections."""
        await self.client.aclose()
        logger.info("database_service_closed")


# Singleton pattern
_db_service: Optional[DatabaseService] = None


@lru_cache(maxsize=1)
def get_database_service() -> DatabaseService:
    """
    Get or create singleton database service instance.
    
    Returns:
        DatabaseService instance
    """
    global _db_service
    if _db_service is None:
        _db_service = DatabaseService()
    return _db_service

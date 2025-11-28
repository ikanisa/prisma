"""
Execution Repository

Provides CRUD operations for agent executions using the database service.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from functools import lru_cache
import structlog

from server.services.database_service import get_database_service, DatabaseService

logger = structlog.get_logger(__name__)


class ExecutionRepository:
    """Repository for execution operations."""
    
    def __init__(self, db_service: Optional[DatabaseService] = None):
        """
        Initialize execution repository.
        
        Args:
            db_service: Database service instance (defaults to singleton)
        """
        self.db = db_service or get_database_service()
    
    async def create_execution(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new execution record.
        
        Args:
            execution_data: Execution fields including:
                - agent_id: Agent UUID
                - query: User query
                - context: Optional context dict
                - status: Execution status (pending/running/completed/failed)
                
        Returns:
            Created execution record
        """
        try:
            executions = await self.db.insert(
                table="agent_executions",
                data=execution_data
            )
            
            execution = executions[0] if isinstance(executions, list) else executions
            logger.info(
                "execution_created",
                execution_id=execution.get("id"),
                agent_id=execution.get("agent_id")
            )
            
            return execution
        except Exception as e:
            logger.error("failed_to_create_execution", error=str(e))
            raise
    
    async def get_execution_by_id(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """
        Get an execution by ID.
        
        Args:
            execution_id: Execution UUID
            
        Returns:
            Execution record or None if not found
        """
        try:
            executions = await self.db.query(
                table="agent_executions",
                select="*",
                filters={"id": execution_id},
                limit=1
            )
            
            if executions:
                logger.info("execution_found", execution_id=execution_id)
                return executions[0]
            
            logger.warning("execution_not_found", execution_id=execution_id)
            return None
        except Exception as e:
            logger.error("failed_to_fetch_execution", execution_id=execution_id, error=str(e))
            raise
    
    async def get_executions_by_agent(
        self,
        agent_id: str,
        status: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all executions for an agent.
        
        Args:
            agent_id: Agent UUID
            status: Filter by status (pending/running/completed/failed)
            limit: Maximum number of records
            offset: Number of records to skip
            
        Returns:
            List of execution records
        """
        filters = {"agent_id": agent_id}
        
        if status:
            filters["status"] = status
        
        try:
            executions = await self.db.query(
                table="agent_executions",
                select="*",
                filters=filters,
                order="created_at.desc",
                limit=limit,
                offset=offset
            )
            
            logger.info(
                "executions_fetched",
                agent_id=agent_id,
                count=len(executions),
                status=status
            )
            
            return executions
        except Exception as e:
            logger.error("failed_to_fetch_executions", agent_id=agent_id, error=str(e))
            raise
    
    async def update_execution_status(
        self,
        execution_id: str,
        status: str,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update execution status and results.
        
        Args:
            execution_id: Execution UUID
            status: New status (running/completed/failed)
            result: Execution result data
            error: Error message if failed
            metrics: Execution metrics (tokens, cost, duration)
            
        Returns:
            Updated execution record or None if not found
        """
        updates: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if result:
            updates["result"] = result
        
        if error:
            updates["error"] = error
        
        if metrics:
            updates["tokens_used"] = metrics.get("tokens_used")
            updates["cost_usd"] = metrics.get("cost_usd")
            updates["duration_ms"] = metrics.get("duration_ms")
        
        if status == "completed":
            updates["completed_at"] = datetime.utcnow().isoformat()
        
        try:
            executions = await self.db.update(
                table="agent_executions",
                filters={"id": execution_id},
                data=updates
            )
            
            if executions:
                execution = executions[0] if isinstance(executions, list) else executions
                logger.info(
                    "execution_updated",
                    execution_id=execution_id,
                    status=status
                )
                return execution
            
            logger.warning("execution_not_found_for_update", execution_id=execution_id)
            return None
        except Exception as e:
            logger.error("failed_to_update_execution", execution_id=execution_id, error=str(e))
            raise
    
    async def get_recent_executions(
        self,
        limit: int = 10,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get recent executions across all agents.
        
        Args:
            limit: Maximum number of records
            status: Filter by status
            
        Returns:
            List of execution records
        """
        filters = {}
        
        if status:
            filters["status"] = status
        
        try:
            executions = await self.db.query(
                table="agent_executions",
                select="*",
                filters=filters,
                order="created_at.desc",
                limit=limit
            )
            
            logger.info("recent_executions_fetched", count=len(executions), status=status)
            return executions
        except Exception as e:
            logger.error("failed_to_fetch_recent_executions", error=str(e))
            raise
    
    async def get_execution_stats(self, agent_id: str) -> Dict[str, Any]:
        """
        Get execution statistics for an agent.
        
        Args:
            agent_id: Agent UUID
            
        Returns:
            Statistics including total executions, success rate, avg cost, etc.
        """
        try:
            # Get all executions for the agent
            executions = await self.get_executions_by_agent(agent_id)
            
            total = len(executions)
            completed = sum(1 for e in executions if e.get("status") == "completed")
            failed = sum(1 for e in executions if e.get("status") == "failed")
            
            total_cost = sum(e.get("cost_usd", 0) or 0 for e in executions)
            total_tokens = sum(e.get("tokens_used", 0) or 0 for e in executions)
            
            avg_cost = total_cost / total if total > 0 else 0
            avg_tokens = total_tokens / total if total > 0 else 0
            success_rate = (completed / total * 100) if total > 0 else 0
            
            stats = {
                "total_executions": total,
                "completed": completed,
                "failed": failed,
                "success_rate": round(success_rate, 2),
                "total_cost_usd": round(total_cost, 4),
                "avg_cost_usd": round(avg_cost, 4),
                "total_tokens": total_tokens,
                "avg_tokens": round(avg_tokens, 2)
            }
            
            logger.info("execution_stats_calculated", agent_id=agent_id, stats=stats)
            return stats
        except Exception as e:
            logger.error("failed_to_calculate_stats", agent_id=agent_id, error=str(e))
            raise


@lru_cache(maxsize=1)
def get_execution_repository() -> ExecutionRepository:
    """
    Get or create singleton execution repository instance.
    
    Returns:
        ExecutionRepository instance
    """
    return ExecutionRepository()

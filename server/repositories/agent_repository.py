"""
Agent Repository

Provides CRUD operations for agents using the database service.
"""

from typing import List, Optional, Dict, Any
from functools import lru_cache
import structlog

from server.services.database_service import get_database_service, DatabaseService

logger = structlog.get_logger(__name__)


class AgentRepository:
    """Repository for agent operations."""
    
    def __init__(self, db_service: Optional[DatabaseService] = None):
        """
        Initialize agent repository.
        
        Args:
            db_service: Database service instance (defaults to singleton)
        """
        self.db = db_service or get_database_service()
    
    async def get_all_agents(
        self,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all agents with optional filtering.
        
        Args:
            category: Filter by category
            is_active: Filter by active status
            limit: Maximum number of records
            offset: Number of records to skip
            
        Returns:
            List of agent records
        """
        filters = {}
        
        if category:
            filters["category"] = category
        if is_active is not None:
            filters["is_active"] = is_active
        
        try:
            agents = await self.db.query(
                table="agent_profiles",
                select="*",
                filters=filters,
                order="name.asc",
                limit=limit,
                offset=offset
            )
            
            logger.info("agents_fetched", count=len(agents), category=category)
            return agents
        except Exception as e:
            logger.error("failed_to_fetch_agents", error=str(e))
            raise
    
    async def get_agent_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """
        Get a single agent by slug.
        
        Args:
            slug: Agent slug (e.g., "tax-corp-eu-022")
            
        Returns:
            Agent record or None if not found
        """
        try:
            agents = await self.db.query(
                table="agent_profiles",
                select="*",
                filters={"slug": slug},
                limit=1
            )
            
            if agents:
                logger.info("agent_found", slug=slug)
                return agents[0]
            
            logger.warning("agent_not_found", slug=slug)
            return None
        except Exception as e:
            logger.error("failed_to_fetch_agent", slug=slug, error=str(e))
            raise
    
    async def get_agent_by_id(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single agent by ID.
        
        Args:
            agent_id: Agent UUID
            
        Returns:
            Agent record or None if not found
        """
        try:
            agents = await self.db.query(
                table="agent_profiles",
                select="*",
                filters={"id": agent_id},
                limit=1
            )
            
            if agents:
                logger.info("agent_found", agent_id=agent_id)
                return agents[0]
            
            logger.warning("agent_not_found", agent_id=agent_id)
            return None
        except Exception as e:
            logger.error("failed_to_fetch_agent", agent_id=agent_id, error=str(e))
            raise
    
    async def create_agent(self, agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new agent.
        
        Args:
            agent_data: Agent fields
            
        Returns:
            Created agent record
        """
        try:
            agents = await self.db.insert(
                table="agent_profiles",
                data=agent_data
            )
            
            agent = agents[0] if isinstance(agents, list) else agents
            logger.info("agent_created", slug=agent.get("slug"), id=agent.get("id"))
            
            return agent
        except Exception as e:
            logger.error("failed_to_create_agent", error=str(e))
            raise
    
    async def update_agent(
        self,
        slug: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update an agent by slug.
        
        Args:
            slug: Agent slug
            updates: Fields to update
            
        Returns:
            Updated agent record or None if not found
        """
        try:
            agents = await self.db.update(
                table="agent_profiles",
                filters={"slug": slug},
                data=updates
            )
            
            if agents:
                agent = agents[0] if isinstance(agents, list) else agents
                logger.info("agent_updated", slug=slug, id=agent.get("id"))
                return agent
            
            logger.warning("agent_not_found_for_update", slug=slug)
            return None
        except Exception as e:
            logger.error("failed_to_update_agent", slug=slug, error=str(e))
            raise
    
    async def delete_agent(self, slug: str) -> bool:
        """
        Delete an agent by slug.
        
        Args:
            slug: Agent slug
            
        Returns:
            True if deleted, False if not found
        """
        try:
            agents = await self.db.delete(
                table="agent_profiles",
                filters={"slug": slug}
            )
            
            if agents:
                logger.info("agent_deleted", slug=slug)
                return True
            
            logger.warning("agent_not_found_for_delete", slug=slug)
            return False
        except Exception as e:
            logger.error("failed_to_delete_agent", slug=slug, error=str(e))
            raise
    
    async def get_agents_by_category(self, category: str) -> List[Dict[str, Any]]:
        """
        Get all agents in a category.
        
        Args:
            category: Category name
            
        Returns:
            List of agent records
        """
        return await self.get_all_agents(category=category)
    
    async def get_active_agents(self) -> List[Dict[str, Any]]:
        """
        Get all active agents.
        
        Returns:
            List of active agent records
        """
        return await self.get_all_agents(is_active=True)


@lru_cache(maxsize=1)
def get_agent_repository() -> AgentRepository:
    """
    Get or create singleton agent repository instance.
    
    Returns:
        AgentRepository instance
    """
    return AgentRepository()

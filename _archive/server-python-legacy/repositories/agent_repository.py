"""
Agent Repository

Provides CRUD operations for agents using the database service.
"""

from typing import List, Optional, Dict, Any, Tuple, Union
from functools import lru_cache
from datetime import datetime
import structlog

from server.services.database_service import get_database_service, DatabaseService

logger = structlog.get_logger(__name__)
AGENT_TABLE = "agents"


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
        offset: Optional[int] = None,
        organization_id: Optional[str] = None,
        agent_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        include_count: bool = False
    ) -> Union[List[Dict[str, Any]], Tuple[List[Dict[str, Any]], int]]:
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
        filters: Dict[str, Any] = {}
        
        if category:
            filters["category"] = category
        if is_active is not None:
            filters["status"] = "active" if is_active else "archived"
        if organization_id:
            filters["organization_id"] = organization_id
        if agent_type:
            filters["type"] = agent_type
        if status:
            filters["status"] = status
        if search:
            filters["name"] = {"ilike": f"%{search}%"}
        
        try:
            if include_count:
                agents, total = await self.db.query_with_count(
                    table=AGENT_TABLE,
                    select="*",
                    filters=filters,
                    order="updated_at.desc",
                    limit=limit,
                    offset=offset
                )
                logger.info(
                    "agents_fetched",
                    count=len(agents),
                    category=category,
                    organization_id=organization_id,
                    include_count=True,
                )
                return agents, total

            agents = await self.db.query(
                table=AGENT_TABLE,
                select="*",
                filters=filters,
                order="updated_at.desc",
                limit=limit,
                offset=offset
            )
            
            logger.info(
                "agents_fetched",
                count=len(agents),
                category=category,
                organization_id=organization_id,
            )
            return agents
        except Exception as e:
            logger.error("failed_to_fetch_agents", error=str(e))
            raise
    
    async def get_agent_by_slug(self, slug: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get a single agent by slug.
        
        Args:
            slug: Agent slug (e.g., "tax-corp-eu-022")
            
        Returns:
            Agent record or None if not found
        """
        filters = {"slug": slug}
        if organization_id:
            filters["organization_id"] = organization_id

        try:
            agents = await self.db.query(
                table=AGENT_TABLE,
                select="*",
                filters=filters,
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
    
    async def get_agent_by_id(self, agent_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get a single agent by ID.
        
        Args:
            agent_id: Agent UUID
            
        Returns:
            Agent record or None if not found
        """
        filters = {"id": agent_id}
        if organization_id:
            filters["organization_id"] = organization_id

        try:
            agents = await self.db.query(
                table=AGENT_TABLE,
                select="*",
                filters=filters,
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
                table=AGENT_TABLE,
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
        agent_id: str,
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update an agent by ID."""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()

            agents = await self.db.update(
                table=AGENT_TABLE,
                filters={"id": agent_id},
                data=updates
            )
            
            if agents:
                agent = agents[0] if isinstance(agents, list) else agents
                logger.info("agent_updated", agent_id=agent_id)
                return agent
            
            logger.warning("agent_not_found_for_update", agent_id=agent_id)
            return None
        except Exception as e:
            logger.error("failed_to_update_agent", agent_id=agent_id, error=str(e))
            raise
    
    async def delete_agent(self, agent_id: str) -> bool:
        """
        Delete an agent by slug.
        
        Args:
            slug: Agent slug
            
        Returns:
            True if deleted, False if not found
        """
        try:
            agents = await self.db.update(
                table=AGENT_TABLE,
                filters={"id": agent_id},
                data={
                    "status": "archived",
                    "is_public": False,
                    "updated_at": datetime.utcnow().isoformat(),
                },
            )

            if agents:
                logger.info("agent_deleted", agent_id=agent_id)
                return True
            
            logger.warning("agent_not_found_for_delete", agent_id=agent_id)
            return False
        except Exception as e:
            logger.error("failed_to_delete_agent", agent_id=agent_id, error=str(e))
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

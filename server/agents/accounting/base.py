"""
Base Accounting Agent
Abstract base class for all accounting specialist agents.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseAccountingAgent(ABC):
    """
    Abstract base class for accounting specialist agents.
    
    All accounting agents inherit from this class and implement:
    - get_persona(): Agent persona and system prompt
    - get_tools(): Available tools/functions
    - get_standards(): Supported accounting standards (IFRS, GAAP, etc.)
    """
    
    def __init__(self, org_id: str, config: Optional[Dict[str, Any]] = None):
        self.org_id = org_id
        self.config = config or {}
        self.version = "1.0.0"
        self.created_at = datetime.utcnow()
        
    @property
    @abstractmethod
    def agent_id(self) -> str:
        """Unique agent identifier"""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Agent display name"""
        pass
    
    @property
    @abstractmethod
    def category(self) -> str:
        """Agent category (e.g., 'revenue', 'lease', 'consolidation')"""
        pass
    
    @abstractmethod
    def get_persona(self) -> Dict[str, Any]:
        """
        Get agent persona configuration.
        
        Returns:
            Dict with keys:
            - name: Display name
            - role: Professional role
            - system_prompt: AI system instructions
            - capabilities: List of capabilities
        """
        pass
    
    @abstractmethod
    def get_tools(self) -> List[Dict[str, Any]]:
        """
        Get available tools for this agent.
        
        Returns:
            List of tool definitions with:
            - name: Tool function name
            - description: What the tool does
            - parameters: Input parameter schema
        """
        pass
    
    @abstractmethod
    def get_standards(self) -> List[str]:
        """
        Get supported accounting standards.
        
        Returns:
            List of standard codes (e.g., ['IFRS 15', 'ASC 606'])
        """
        pass
    
    async def process_query(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process an accounting query.
        
        Args:
            query: User's accounting question
            context: Additional context
            
        Returns:
            Response with accounting guidance
        """
        logger.info(f"Processing query for {self.agent_id} in org {self.org_id}")
        
        response = {
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "query": query,
            "context": context or {},
            "timestamp": datetime.utcnow().isoformat(),
            "status": "processed",
            "guidance": await self._generate_guidance(query, context),
            "accounting_entries": self._generate_entries(query, context),
            "citations": self._get_relevant_citations(query, context),
            "follow_up_actions": self._suggest_actions(query, context),
            "confidence": self._assess_confidence(query, context)
        }
        
        return response
    
    async def _generate_guidance(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """
        Generate accounting guidance using AI.
        Subclasses can override for specialized behavior.
        """
        try:
            # Lazy import to avoid dependency issues if Gemini not configured
            from server.services.gemini_service import get_gemini_service
            gemini = get_gemini_service()
            persona = self.get_persona()
            
            prompt = f"""{persona['system_prompt']}

Query: {query}

Context: {context or 'No additional context provided'}

Provide expert accounting guidance following your role as {persona['role']}.
Reference relevant accounting standards and provide practical journal entries where applicable."""
            
            guidance = await gemini.generate(prompt, temperature=0.3)
            return guidance
            
        except Exception as e:
            logger.warning(f"AI generation not available, using fallback: {e}")
            return self._get_fallback_guidance(query, context)
    
    def _get_fallback_guidance(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Fallback guidance when AI is not available"""
        persona = self.get_persona()
        standards = ", ".join(self.get_standards())
        return f"Based on {standards}, the following guidance applies: Please consult with a qualified accountant for specific advice on: {query[:100]}"
    
    def _generate_entries(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate sample journal entries.
        Subclasses override with specific entries.
        """
        return []
    
    def _get_relevant_citations(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        """
        Get relevant standard citations.
        Subclasses override with specific citations.
        """
        return [{"standard": s, "reference": f"See {s} guidance"} for s in self.get_standards()]
    
    def _suggest_actions(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> List[str]:
        """
        Suggest follow-up actions.
        Subclasses override with specific recommendations.
        """
        return []
    
    def _assess_confidence(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> float:
        """
        Assess confidence level in response (0.0 to 1.0).
        """
        return 0.8
    
    def get_metadata(self) -> Dict[str, Any]:
        """Get agent metadata"""
        persona = self.get_persona()
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "category": self.category,
            "version": self.version,
            "standards": self.get_standards(),
            "capabilities": persona.get("capabilities", []),
            "created_at": self.created_at.isoformat()
        }

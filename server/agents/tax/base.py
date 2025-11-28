"""
Base Tax Agent
Abstract base class for all tax specialist agents.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseTaxAgent(ABC):
    """
    Abstract base class for tax specialist agents.
    
    All tax agents inherit from this class and implement:
    - get_persona(): Agent persona and system prompt
    - get_tools(): Available tools/functions
    - get_jurisdictions(): Covered tax jurisdictions
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
        """Agent category (e.g., 'corporate-tax', 'vat', 'transfer-pricing')"""
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
            - personality_traits: List of traits
            - communication_style: Style preference
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
    def get_jurisdictions(self) -> List[str]:
        """
        Get covered tax jurisdictions.
        
        Returns:
            List of jurisdiction codes/names
        """
        pass
    
    async def process_query(
        self,
        query: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a tax query (common implementation).
        
        Args:
            query: User's tax question
            context: Additional context (client info, jurisdiction, etc.)
            
        Returns:
            Response with tax guidance
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
        Generate tax guidance using AI.
        Subclasses can override for specialized behavior.
        """
        # In production, this integrates with Gemini service
        from server.services.gemini_service import get_gemini_service
        
        try:
            gemini = get_gemini_service()
            persona = self.get_persona()
            
            # Build enhanced prompt with persona
            prompt = f"""{persona['system_prompt']}

Query: {query}

Context: {context or 'No additional context provided'}

Provide expert tax guidance following your role as {persona['role']}.
Include specific citations and actionable recommendations."""
            
            guidance = await gemini.generate(prompt, temperature=0.3)
            return guidance
            
        except Exception as e:
            logger.error(f"Error generating guidance: {e}")
            return f"Error processing query: {str(e)}"
    
    def _get_relevant_citations(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        """
        Get relevant legal/regulatory citations.
        Subclasses override with jurisdiction-specific citations.
        """
        return []
    
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
        # Simple heuristic - subclasses can improve
        if context and context.get('jurisdiction') in self.get_jurisdictions():
            return 0.9
        return 0.7
    
    def get_metadata(self) -> Dict[str, Any]:
        """Get agent metadata"""
        persona = self.get_persona()
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "category": self.category,
            "version": self.version,
            "jurisdictions": self.get_jurisdictions(),
            "capabilities": persona.get("capabilities", []),
            "created_at": self.created_at.isoformat()
        }

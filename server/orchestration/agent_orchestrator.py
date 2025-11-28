"""
Agent Orchestration System
Coordinates multiple agents to solve complex workflows.
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging
from server.agents.tax import get_tax_agent
from server.agents.accounting import get_accounting_agent

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Orchestrates multiple agents to solve complex multi-step problems.
    
    Features:
    - Multi-agent workflows
    - Task routing based on query analysis
    - Result aggregation
    - Agent collaboration
    """
    
    def __init__(self, org_id: str):
        self.org_id = org_id
        self.execution_history: List[Dict[str, Any]] = []
        
    async def route_query(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Route a query to the most appropriate agent(s).
        
        Args:
            query: User query
            context: Additional context
            
        Returns:
            Orchestrated response
        """
        logger.info(f"Routing query: {query[:50]}...")
        
        # Analyze query to determine agent type
        agent_type = self._analyze_query_type(query)
        
        if agent_type == "multi":
            return await self._execute_multi_agent_workflow(query, context)
        else:
            return await self._execute_single_agent(query, context, agent_type)
    
    def _analyze_query_type(self, query: str) -> str:
        """
        Analyze query to determine which agent(s) to use.
        
        Returns:
            'tax', 'accounting', or 'multi'
        """
        query_lower = query.lower()
        
        # Tax keywords
        tax_keywords = ['tax', 'vat', 'gst', 'withholding', 'treaty', 'beps', 'transfer pricing']
        # Accounting keywords
        acct_keywords = ['ifrs', 'gaap', 'lease', 'revenue', 'depreciation', 'consolidation', 'financial statement']
        
        has_tax = any(kw in query_lower for kw in tax_keywords)
        has_acct = any(kw in query_lower for kw in acct_keywords)
        
        if has_tax and has_acct:
            return "multi"
        elif has_tax:
            return "tax"
        elif has_acct:
            return "accounting"
        else:
            return "tax"  # Default to tax
    
    async def _execute_single_agent(
        self,
        query: str,
        context: Optional[Dict[str, Any]],
        agent_type: str
    ) -> Dict[str, Any]:
        """Execute query with a single agent"""
        if agent_type == "tax":
            # Route to appropriate tax agent based on jurisdiction
            jurisdiction = context.get('jurisdiction', 'US') if context else 'US'
            agent_id = self._select_tax_agent(jurisdiction)
            agent = get_tax_agent(agent_id, self.org_id)
        else:
            # Route to appropriate accounting agent
            agent_id = "acct-finstat-001"  # Default to financial statements
            agent = get_accounting_agent(agent_id, self.org_id)
        
        response = await agent.process_query(query, context)
        
        self.execution_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "query": query,
            "agent_id": agent_id,
            "type": "single"
        })
        
        return response
    
    async def _execute_multi_agent_workflow(
        self,
        query: str,
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Execute a multi-agent workflow for complex queries.
        
        Example: "How does the tax treatment affect the accounting for this lease?"
        - Step 1: Lease accounting agent analyzes accounting treatment
        - Step 2: Tax agent analyzes tax implications
        - Step 3: Aggregate and reconcile responses
        """
        logger.info("Executing multi-agent workflow")
        
        # Execute accounting agent first
        acct_agent = get_accounting_agent("acct-lease-001", self.org_id)
        acct_response = await acct_agent.process_query(query, context)
        
        # Use accounting response as context for tax agent
        tax_context = {
            **(context or {}),
            "accounting_treatment": acct_response.get("guidance"),
            "accounting_entries": acct_response.get("accounting_entries")
        }
        
        tax_agent = get_tax_agent("tax-corp-us-050", self.org_id)
        tax_response = await tax_agent.process_query(query, tax_context)
        
        # Aggregate responses
        aggregated = {
            "orchestration_id": f"orch-{datetime.utcnow().timestamp()}",
            "query": query,
            "workflow_type": "multi-agent",
            "agents_involved": [
                acct_agent.agent_id,
                tax_agent.agent_id
            ],
            "responses": {
                "accounting": acct_response,
                "tax": tax_response
            },
            "summary": self._generate_summary(acct_response, tax_response),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.execution_history.append({
            "timestamp": datetime.utcnow().isoformat(),
            "query": query,
            "agents": [acct_agent.agent_id, tax_agent.agent_id],
            "type": "multi"
        })
        
        return aggregated
    
    def _select_tax_agent(self, jurisdiction: str) -> str:
        """Select appropriate tax agent based on jurisdiction"""
        jurisdiction_map = {
            "US": "tax-corp-us-050",
            "UK": "tax-corp-uk-025",
            "EU": "tax-corp-eu-027",
            "CA": "tax-corp-ca-013",
            "MT": "tax-corp-mt-003",
            "RW": "tax-corp-rw-002"
        }
        return jurisdiction_map.get(jurisdiction, "tax-corp-us-050")
    
    def _generate_summary(self, acct_response: Dict, tax_response: Dict) -> str:
        """Generate executive summary from multiple agent responses"""
        return f"""
Multi-Agent Analysis Summary:

Accounting Perspective:
{acct_response.get('guidance', '')[:200]}...

Tax Perspective:
{tax_response.get('guidance', '')[:200]}...

Recommendation: Review both accounting and tax implications before finalizing treatment.
"""
    
    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get orchestration execution history"""
        return self.execution_history


def get_orchestrator(org_id: str) -> AgentOrchestrator:
    """Factory function for agent orchestrator"""
    return AgentOrchestrator(org_id)

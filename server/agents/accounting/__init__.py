"""
Accounting Agent Registry
Central registry for all accounting specialist agents.
"""
from typing import Dict, Type, List
from .base import BaseAccountingAgent
from .specialists import (
    RevenueRecognitionAgent,
    LeaseAccountingAgent,
    FinancialStatementsAgent,
    ConsolidationAgent,
    CashFlowAgent,
    CostAccountingAgent,
    InventoryAgent,
    FixedAssetsAgent
)

ACCOUNTING_AGENTS: Dict[str, Type[BaseAccountingAgent]] = {
    "acct-revenue-001": RevenueRecognitionAgent,
    "acct-lease-001": LeaseAccountingAgent,
    "acct-finstat-001": FinancialStatementsAgent,
    "acct-consol-001": ConsolidationAgent,
    "acct-cashflow-001": CashFlowAgent,
    "acct-cost-001": CostAccountingAgent,
    "acct-inventory-001": InventoryAgent,
    "acct-ppe-001": FixedAssetsAgent,
}


def get_accounting_agent(agent_id: str, org_id: str) -> BaseAccountingAgent:
    """Get an accounting agent by ID."""
    agent_class = ACCOUNTING_AGENTS.get(agent_id)
    if not agent_class:
        raise ValueError(f"Unknown accounting agent: {agent_id}")
    return agent_class(org_id)


def list_accounting_agents() -> List[Dict[str, str]]:
    """List all available accounting agents."""
    agents = []
    for agent_id, agent_class in ACCOUNTING_AGENTS.items():
        temp_agent = agent_class(org_id="system")
        agents.append({
            "agent_id": agent_id,
            "name": temp_agent.name,
            "category": temp_agent.category,
            "standards": temp_agent.get_standards()
        })
    return agents


__all__ = [
    "get_accounting_agent",
    "list_accounting_agents",
    "ACCOUNTING_AGENTS",
    "BaseAccountingAgent",
    "RevenueRecognitionAgent",
    "LeaseAccountingAgent",
    "FinancialStatementsAgent",
    "ConsolidationAgent",
    "CashFlowAgent",
    "CostAccountingAgent",
    "InventoryAgent",
    "FixedAssetsAgent",
]

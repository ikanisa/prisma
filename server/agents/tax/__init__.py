"""
Tax Agent Registry
Central registry for all tax specialist agents.
"""
from typing import Dict, Type, List
from .base import BaseTaxAgent
from .eu_corporate_tax import EUCorporateTaxAgent
from .us_corporate_tax import USCorporateTaxAgent
from .uk_corporate_tax import UKCorporateTaxAgent
from .specialists import (
    CanadaCorporateTaxAgent,
    MaltaCorporateTaxAgent,
    RwandaCorporateTaxAgent,
    TransferPricingAgent,
    VATGSTAgent,
    InternationalTaxAgent,
    TaxComplianceAgent,
    TaxPlanningAgent,
    TaxControversyAgent
)

TAX_AGENTS: Dict[str, Type[BaseTaxAgent]] = {
    "tax-corp-eu-027": EUCorporateTaxAgent,
    "tax-corp-us-050": USCorporateTaxAgent,
    "tax-corp-uk-025": UKCorporateTaxAgent,
    "tax-corp-ca-013": CanadaCorporateTaxAgent,
    "tax-corp-mt-003": MaltaCorporateTaxAgent,
    "tax-corp-rw-002": RwandaCorporateTaxAgent,
    "tax-tp-global-001": TransferPricingAgent,
    "tax-vat-global-001": VATGSTAgent,
    "tax-intl-global-001": InternationalTaxAgent,
    "tax-comp-global-001": TaxComplianceAgent,
    "tax-plan-global-001": TaxPlanningAgent,
    "tax-cont-global-001": TaxControversyAgent,
}

def get_tax_agent(agent_id: str, org_id: str) -> BaseTaxAgent:
    agent_class = TAX_AGENTS.get(agent_id)
    if not agent_class:
        raise ValueError(f"Unknown tax agent: {agent_id}")
    return agent_class(org_id)

def list_tax_agents() -> List[Dict[str, str]]:
    agents = []
    for agent_id, agent_class in TAX_AGENTS.items():
        temp_agent = agent_class(org_id="system")
        agents.append({
            "agent_id": agent_id,
            "name": temp_agent.name,
            "category": temp_agent.category,
            "jurisdictions": temp_agent.get_jurisdictions()
        })
    return agents

__all__ = ["get_tax_agent", "list_tax_agents", "TAX_AGENTS"]

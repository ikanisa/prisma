"""
US Corporate Tax Specialist Agent
Federal and state corporate tax compliance, R&D credits, international provisions.
"""
from typing import Dict, Any, List
from .base import BaseTaxAgent


class USCorporateTaxAgent(BaseTaxAgent):
    """US Corporate Tax Specialist - Federal and State"""
    
    @property
    def agent_id(self) -> str:
        return "tax-corp-us-050"
    
    @property
    def name(self) -> str:
        return "US Corporate Tax Specialist"
    
    @property
    def category(self) -> str:
        return "corporate-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return ["US", "US-FEDERAL"] + [f"US-{state}" for state in [
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
            "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
            "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
            "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
            "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
        ]]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "US Corporate Tax Specialist",
            "role": "Senior Tax Advisor - US Federal & State",
            "system_prompt": """You are an expert US corporate tax specialist with deep knowledge of:

1. Federal Corporate Tax (IRC):
   - IRC §11 corporate tax rates (21% flat rate post-TCJA)
   - IRC §199A Qualified Business Income deduction
   - IRC §41 Research & Development tax credits
   - IRC §163(j) interest deduction limitations
   - IRC §174 R&D expense capitalization

2. International Tax Provisions:
   - GILTI (Global Intangible Low-Taxed Income)
   - FDII (Foreign-Derived Intangible Income)
   - Subpart F income inclusions
   - IRC §245A participation exemption
   - BEAT (Base Erosion Anti-Abuse Tax)

3. State & Local Tax (SALT):
   - Nexus determination and apportionment
   - Combined reporting requirements
   - State tax credits and incentives
   - Wayfair implications for economic nexus

4. Tax Credits & Incentives:
   - R&D credit (federal and state)
   - Energy credits (§45, §48)
   - New Markets Tax Credit
   - Opportunity Zone benefits

Provide specific IRC citations and current IRS guidance.""",
            "personality_traits": ["analytical", "code-focused", "practical", "strategic"],
            "communication_style": "professional-technical",
            "capabilities": [
                "federal_tax_compliance",
                "state_tax_planning",
                "rd_credit_calculation",
                "international_tax",
                "gilti_fdii_analysis",
                "salt_optimization",
                "tax_credit_maximization"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_federal_tax",
                "description": "Calculate US federal corporate tax liability",
                "parameters": {
                    "taxable_income": {"type": "number"},
                    "tax_year": {"type": "integer"}
                }
            },
            {
                "name": "calculate_rd_credit",
                "description": "Calculate federal and state R&D tax credits",
                "parameters": {
                    "qualified_research_expenses": {"type": "number"},
                    "base_amount": {"type": "number"},
                    "states": {"type": "array"}
                }
            },
            {
                "name": "calculate_gilti",
                "description": "Calculate GILTI inclusion under IRC §951A",
                "parameters": {
                    "tested_income": {"type": "number"},
                    "tested_loss": {"type": "number"},
                    "qbai": {"type": "number"}
                }
            },
            {
                "name": "determine_nexus",
                "description": "Determine state tax nexus based on activity",
                "parameters": {
                    "state": {"type": "string"},
                    "activities": {"type": "array"},
                    "revenue": {"type": "number"}
                }
            }
        ]
    
    def _get_relevant_citations(self, query: str, context: Dict[str, Any]) -> List[Dict[str, str]]:
        return [
            {
                "type": "irc",
                "reference": "IRC §11",
                "title": "Corporate Tax Rate",
                "url": "https://www.law.cornell.edu/uscode/text/26/11"
            },
            {
                "type": "irc",
                "reference": "IRC §41",
                "title": "Research & Development Credit",
                "url": "https://www.law.cornell.edu/uscode/text/26/41"
            },
            {
                "type": "irc",
                "reference": "IRC §951A",
                "title": "Global Intangible Low-Taxed Income",
                "url": "https://www.law.cornell.edu/uscode/text/26/951A"
            }
        ]
    
    def _suggest_actions(self, query: str, context: Dict[str, Any]) -> List[str]:
        return [
            "Review R&D credit qualification and documentation",
            "Assess GILTI high-tax exception applicability",
            "Evaluate state nexus and apportionment methodologies",
            "Consider §163(j) interest limitation planning",
            "Optimize FDII deduction for foreign sales"
        ]


def get_us_corporate_tax_agent(org_id: str) -> USCorporateTaxAgent:
    """Factory function for US Corporate Tax Agent"""
    return USCorporateTaxAgent(org_id)

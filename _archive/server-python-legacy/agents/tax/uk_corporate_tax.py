"""
UK Corporate Tax Specialist Agent
Corporation Tax, R&D incentives, Patent Box, Transfer Pricing.
"""
from typing import Dict, Any, List
from .base import BaseTaxAgent


class UKCorporateTaxAgent(BaseTaxAgent):
    """UK Corporate Tax Specialist"""
    
    @property
    def agent_id(self) -> str:
        return "tax-corp-uk-025"
    
    @property
    def name(self) -> str:
        return "UK Corporate Tax Specialist"
    
    @property
    def category(self) -> str:
        return "corporate-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return ["GB", "UK"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "UK Corporate Tax Specialist",
            "role": "Senior Tax Advisor - UK Corporation Tax",
            "system_prompt": """You are an expert UK corporate tax specialist with expertise in:

1. Corporation Tax:
   - Main rate (25% for profits >£250k from April 2023)
   - Small profits rate (19% for profits <£50k)
   - Marginal relief for profits £50k-£250k
   - Corporate Interest Restriction (CIR)

2. R&D Tax Relief:
   - SME R&D relief (enhanced deduction and credit)
   - RDEC (Research & Development Expenditure Credit)
   - Post-April 2023 merged scheme
   - Qualifying R&D expenditure criteria

3. Patent Box:
   - 10% preferential rate on qualifying IP profits
   - Nexus approach calculation
   - Streaming vs. proportionate allocation
   - Tracking & tracing requirements

4. Transfer Pricing & Diverted Profits:
   - Transfer pricing documentation requirements
   - Diverted Profits Tax (DPT) at 25%
   - Country-by-Country Reporting
   - Advance Pricing Agreements (APAs)

Cite relevant Finance Acts and HMRC guidance.""",
            "personality_traits": ["precise", "compliance-focused", "strategic"],
            "communication_style": "professional-british",
            "capabilities": [
                "corporation_tax",
                "rd_relief",
                "patent_box",
                "transfer_pricing",
                "diverted_profits_tax",
                "group_relief"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_corporation_tax",
                "description": "Calculate UK Corporation Tax with marginal relief",
                "parameters": {
                    "taxable_profits": {"type": "number"},
                    "accounting_period_months": {"type": "integer"}
                }
            },
            {
                "name": "calculate_rd_relief",
                "description": "Calculate R&D tax relief (SME or RDEC)",
                "parameters": {
                    "qualifying_expenditure": {"type": "number"},
                    "is_sme": {"type": "boolean"},
                    "is_loss_making": {"type": "boolean"}
                }
            },
            {
                "name": "calculate_patent_box",
                "description": "Calculate Patent Box relief",
                "parameters": {
                    "relevant_ip_profits": {"type": "number"},
                    "qualifying_expenditure": {"type": "number"},
                    "overall_expenditure": {"type": "number"}
                }
            }
        ]
    
    def _get_relevant_citations(self, query: str, context: Dict[str, Any]) -> List[Dict[str, str]]:
        return [
            {
                "type": "legislation",
                "reference": "Finance Act 2023",
                "title": "Corporation Tax Rate Changes",
                "url": "https://www.gov.uk/government/publications/introduction-of-a-new-main-rate-of-corporation-tax"
            },
            {
                "type": "hmrc",
                "reference": "CIRD81000",
                "title": "R&D Tax Relief Guidance",
                "url": "https://www.gov.uk/hmrc-internal-manuals/corporate-intangibles-research-and-development-manual"
            }
        ]


def get_uk_corporate_tax_agent(org_id: str) -> UKCorporateTaxAgent:
    """Factory function for UK Corporate Tax Agent"""
    return UKCorporateTaxAgent(org_id)

"""
EU Corporate Tax Specialist Agent
Comprehensive EU-27 tax compliance, transfer pricing, VAT, and BEPS.
"""
from typing import Dict, Any, List
from .base import BaseTaxAgent


class EUCorporateTaxAgent(BaseTaxAgent):
    """EU Corporate Tax Specialist covering all EU-27 jurisdictions"""
    
    @property
    def agent_id(self) -> str:
        return "tax-corp-eu-027"
    
    @property
    def name(self) -> str:
        return "EU Corporate Tax Specialist"
    
    @property
    def category(self) -> str:
        return "corporate-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return [
            "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
            "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
            "PL", "PT", "RO", "SK", "SI", "ES", "SE"
        ]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "EU Corporate Tax Specialist",
            "role": "Senior Tax Advisor - EU-27 Compliance",
            "system_prompt": """You are an expert EU corporate tax specialist with comprehensive knowledge of:

1. EU Tax Directives:
   - Parent-Subsidiary Directive (2011/96/EU)
   - Interest & Royalties Directive (2003/49/EC)
   - Anti-Tax Avoidance Directive (ATAD I & II)
   - DAC6 mandatory disclosure requirements

2. Transfer Pricing:
   - OECD Transfer Pricing Guidelines (2022 edition)
   - EU Transfer Pricing Documentation Forum standards
   - Master File and Local File requirements
   - Country-by-Country Reporting (CbCR)

3. VAT Compliance:
   - EU VAT Directive (2006/112/EC)
   - Cross-border VAT treatment
   - MOSS/OSS/IOSS registration systems
   - VAT groups and consolidation rules

4. BEPS Implementation:
   - All 15 BEPS Action items
   - Pillar One and Pillar Two (GloBE rules)
   - Global minimum tax rate (15%)
   - Qualified Domestic Minimum Top-up Tax (QDMTT)

Provide jurisdiction-specific guidance with precise citations.""",
            "personality_traits": ["precise", "detail-oriented", "regulatory-focused", "analytical"],
            "communication_style": "formal-professional",
            "capabilities": [
                "eu_tax_compliance",
                "transfer_pricing",
                "vat_advisory",
                "beps_implementation",
                "tax_treaty_interpretation",
                "dac6_disclosure",
                "cbc_reporting",
                "atad_compliance"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "check_corporate_tax_rate",
                "description": "Get current corporate tax rate for EU member state",
                "parameters": {
                    "country_code": {"type": "string", "pattern": "^[A-Z]{2}$"},
                    "tax_year": {"type": "integer", "minimum": 2020, "maximum": 2030}
                }
            },
            {
                "name": "calculate_transfer_price",
                "description": "Calculate arm's length transfer price using OECD methods",
                "parameters": {
                    "method": {"type": "string", "enum": ["CUP", "RPM", "CPM", "TNMM", "PSM"]},
                    "transaction_value": {"type": "number"},
                    "comparable_data": {"type": "object"}
                }
            },
            {
                "name": "determine_vat_treatment",
                "description": "Determine VAT treatment for cross-border EU transaction",
                "parameters": {
                    "from_country": {"type": "string"},
                    "to_country": {"type": "string"},
                    "transaction_type": {"type": "string"},
                    "is_b2b": {"type": "boolean"}
                }
            },
            {
                "name": "assess_dac6_requirement",
                "description": "Assess if arrangement requires DAC6 disclosure",
                "parameters": {
                    "arrangement_details": {"type": "object"},
                    "countries_involved": {"type": "array"},
                    "hallmarks": {"type": "array"}
                }
            },
            {
                "name": "calculate_pillar_two_tax",
                "description": "Calculate Pillar Two top-up tax under GloBE rules",
                "parameters": {
                    "jurisdiction": {"type": "string"},
                    "effective_tax_rate": {"type": "number"},
                    "covered_taxes": {"type": "number"},
                    "globe_income": {"type": "number"}
                }
            }
        ]
    
    def _get_relevant_citations(self, query: str, context: Dict[str, Any]) -> List[Dict[str, str]]:
        return [
            {
                "type": "directive",
                "reference": "ATAD I (2016/1164/EU)",
                "title": "Anti-Tax Avoidance Directive",
                "url": "https://eur-lex.europa.eu/eli/dir/2016/1164"
            },
            {
                "type": "directive",
                "reference": "DAC6 (2018/822/EU)",
                "title": "Mandatory Disclosure Rules",
                "url": "https://eur-lex.europa.eu/eli/dir/2018/822"
            },
            {
                "type": "oecd",
                "reference": "OECD TP Guidelines 2022",
                "title": "Transfer Pricing Guidelines for Multinational Enterprises",
                "url": "https://www.oecd.org/tax/transfer-pricing/"
            }
        ]
    
    def _suggest_actions(self, query: str, context: Dict[str, Any]) -> List[str]:
        return [
            "Review transfer pricing documentation for arm's length compliance",
            "Assess DAC6 disclosure obligations for cross-border arrangements",
            "Evaluate ATAD I/II impact on corporate structure",
            "Consider Pillar Two implications if ETR < 15%",
            "Update substance requirements under anti-avoidance rules"
        ]


def get_eu_corporate_tax_agent(org_id: str) -> EUCorporateTaxAgent:
    """Factory function for EU Corporate Tax Agent"""
    return EUCorporateTaxAgent(org_id)

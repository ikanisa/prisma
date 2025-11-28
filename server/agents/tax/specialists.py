"""
Canada, Malta, Rwanda Corporate Tax Specialists
Transfer Pricing, VAT/GST, International Tax Specialists
Tax Compliance, Planning, and Controversy Specialists
"""
from typing import Dict, Any, List
from .base import BaseTaxAgent


# 4. Canada Corporate Tax Specialist
class CanadaCorporateTaxAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-corp-ca-013"
    
    @property
    def name(self) -> str:
        return "Canada Corporate Tax Specialist"
    
    @property
    def category(self) -> str:
        return "corporate-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return ["CA", "CA-ON", "CA-QC", "CA-BC", "CA-AB"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Canada Corporate Tax Specialist",
            "role": "Senior Tax Advisor - Canada Federal & Provincial",
            "system_prompt": "Expert in Canadian corporate tax including federal/provincial taxes, SR&ED credits, and capital cost allowance.",
            "capabilities": ["canadian_corporate_tax", "sred_credits", "provincial_tax"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "calculate_federal_tax", "description": "Calculate Canadian federal corporate tax"},
            {"name": "calculate_sred_credit", "description": "Calculate SR&ED tax credit"}
        ]


# 5. Malta Corporate Tax Specialist
class MaltaCorporateTaxAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-corp-mt-003"
    
    @property
    def name(self) -> str:
        return "Malta Corporate Tax Specialist"
    
    @property
    def category(self) -> str:
        return "corporate-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return ["MT"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Malta Corporate Tax Specialist",
            "role": "Tax Advisor - Malta Corporate Tax",
            "system_prompt": "Expert in Malta corporate tax including participation exemption, refund system, and holding company regime.",
            "capabilities": ["malta_corporate_tax", "participation_exemption", "tax_refunds"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "calculate_refundable_tax", "description": "Calculate Malta tax refund"}
        ]


# 6. Rwanda Corporate Tax Specialist
class RwandaCorporateTaxAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-corp-rw-002"
    
    @property
    def name(self) -> str:
        return "Rwanda Corporate Tax Specialist"
    
    @property
    def category(self) -> str:
        return "corporate-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return ["RW"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Rwanda Corporate Tax Specialist",
            "role": "Tax Advisor - Rwanda Corporate Tax",
            "system_prompt": "Expert in Rwanda corporate tax including EAC harmonization, IFRS alignment, and thin capitalization rules.",
            "capabilities": ["rwanda_corporate_tax", "eac_compliance", "thin_capitalization"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "check_eac_compliance", "description": "Check EAC tax treaty compliance"}
        ]


# 7. Transfer Pricing Specialist
class TransferPricingAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-tp-global-001"
    
    @property
    def name(self) -> str:
        return "Transfer Pricing Specialist"
    
    @property
    def category(self) -> str:
        return "transfer-pricing"
    
    def get_jurisdictions(self) -> List[str]:
        return ["GLOBAL"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Transfer Pricing Specialist",
            "role": "Senior Transfer Pricing Advisor",
            "system_prompt": """Expert in OECD Transfer Pricing Guidelines, documentation requirements, and Country-by-Country Reporting.
Specializes in arm's length pricing, comparability analysis, and transfer pricing methods (CUP, RPM, CPM, TNMM, PSM).""",
            "capabilities": ["transfer_pricing", "oecd_guidelines", "cbc_reporting", "master_file", "local_file"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "calculate_arms_length_price", "description": "Calculate arm's length transfer price"},
            {"name": "perform_comparability_analysis", "description": "Perform transfer pricing comparability analysis"}
        ]


# 8. VAT/GST Specialist
class VATGSTAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-vat-global-001"
    
    @property
    def name(self) -> str:
        return "VAT/GST Specialist"
    
    @property
    def category(self) -> str:
        return "indirect-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return ["EU", "UK", "AU", "NZ", "CA", "IN"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "VAT/GST Specialist",
            "role": "Indirect Tax Advisor",
            "system_prompt": """Expert in multi-jurisdiction VAT/GST compliance including EU VAT, UK VAT, Australian GST, and Indian GST.
Specializes in cross-border transactions, MOSS/OSS/IOSS systems, and place of supply rules.""",
            "capabilities": ["vat_compliance", "cross_border_vat", "moss_oss", "gst_compliance"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "determine_place_of_supply", "description": "Determine VAT place of supply"},
            {"name": "calculate_vat_liability", "description": "Calculate VAT liability"}
        ]


# 9. International Tax Specialist
class InternationalTaxAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-intl-global-001"
    
    @property
    def name(self) -> str:
        return "International Tax Specialist"
    
    @property
    def category(self) -> str:
        return "international-tax"
    
    def get_jurisdictions(self) -> List[str]:
        return ["GLOBAL"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "International Tax Specialist",
            "role": "International Tax Advisor",
            "system_prompt": """Expert in BEPS compliance, tax treaties, withholding tax, and cross-border tax planning.
Specializes in permanent establishment rules, controlled foreign company legislation, and treaty shopping prevention.""",
            "capabilities": ["beps_compliance", "tax_treaties", "withholding_tax", "pe_analysis"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "analyze_treaty_benefits", "description": "Analyze tax treaty benefits"},
            {"name": "assess_pe_risk", "description": "Assess permanent establishment risk"}
        ]


# 10. Tax Compliance Specialist
class TaxComplianceAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-comp-global-001"
    
    @property
    def name(self) -> str:
        return "Tax Compliance Specialist"
    
    @property
    def category(self) -> str:
        return "tax-compliance"
    
    def get_jurisdictions(self) -> List[str]:
        return ["GLOBAL"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Tax Compliance Specialist",
            "role": "Tax Compliance Manager",
            "system_prompt": """Expert in tax filing deadlines, document preparation, and submission tracking across jurisdictions.
Specializes in compliance calendars, return preparation, and regulatory filing requirements.""",
            "capabilities": ["filing_deadlines", "return_preparation", "compliance_tracking"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "check_filing_deadline", "description": "Check tax filing deadlines"},
            {"name": "track_compliance_status", "description": "Track compliance status"}
        ]


# 11. Tax Planning Specialist
class TaxPlanningAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-plan-global-001"
    
    @property
    def name(self) -> str:
        return "Tax Planning Specialist"
    
    @property
    def category(self) -> str:
        return "tax-planning"
    
    def get_jurisdictions(self) -> List[str]:
        return ["GLOBAL"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Tax Planning Specialist",
            "role": "Strategic Tax Planning Advisor",
            "system_prompt": """Expert in tax optimization strategies, scenario modeling, and risk assessment.
Specializes in corporate restructuring, entity selection, and tax-efficient supply chain design.""",
            "capabilities": ["tax_optimization", "scenario_modeling", "risk_assessment", "restructuring"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "model_tax_scenarios", "description": "Model tax optimization scenarios"},
            {"name": "assess_planning_risks", "description": "Assess tax planning risks"}
        ]


# 12. Tax Controversy Specialist
class TaxControversyAgent(BaseTaxAgent):
    @property
    def agent_id(self) -> str:
        return "tax-cont-global-001"
    
    @property
    def name(self) -> str:
        return "Tax Controversy Specialist"
    
    @property
    def category(self) -> str:
        return "tax-controversy"
    
    def get_jurisdictions(self) -> List[str]:
        return ["GLOBAL"]
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Tax Controversy Specialist",
            "role": "Tax Dispute Resolution Specialist",
            "system_prompt": """Expert in tax dispute resolution, appeals processes, and settlement negotiations.
Specializes in audit defense, mutual agreement procedures (MAP), and litigation strategy.""",
            "capabilities": ["dispute_resolution", "audit_defense", "appeals", "settlement_negotiation"]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {"name": "analyze_dispute_options", "description": "Analyze tax dispute resolution options"},
            {"name": "prepare_appeal_strategy", "description": "Prepare tax appeal strategy"}
        ]


# Factory functions
def get_canada_tax_agent(org_id: str) -> CanadaCorporateTaxAgent:
    return CanadaCorporateTaxAgent(org_id)

def get_malta_tax_agent(org_id: str) -> MaltaCorporateTaxAgent:
    return MaltaCorporateTaxAgent(org_id)

def get_rwanda_tax_agent(org_id: str) -> RwandaCorporateTaxAgent:
    return RwandaCorporateTaxAgent(org_id)

def get_transfer_pricing_agent(org_id: str) -> TransferPricingAgent:
    return TransferPricingAgent(org_id)

def get_vat_gst_agent(org_id: str) -> VATGSTAgent:
    return VATGSTAgent(org_id)

def get_international_tax_agent(org_id: str) -> InternationalTaxAgent:
    return InternationalTaxAgent(org_id)

def get_tax_compliance_agent(org_id: str) -> TaxComplianceAgent:
    return TaxComplianceAgent(org_id)

def get_tax_planning_agent(org_id: str) -> TaxPlanningAgent:
    return TaxPlanningAgent(org_id)

def get_tax_controversy_agent(org_id: str) -> TaxControversyAgent:
    return TaxControversyAgent(org_id)

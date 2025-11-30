"""
Central Agent Registry
Unified registry for all domain agents: Tax, Accounting, Audit, and Corporate Services.
"""
from typing import Dict, Any, List, Optional, Type
from enum import Enum
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


class AgentDomain(Enum):
    """Agent domain categories"""
    TAX = "tax"
    ACCOUNTING = "accounting"
    AUDIT = "audit"
    CORPORATE = "corporate"


@dataclass
class AgentMetadata:
    """Agent metadata for registry"""
    agent_id: str
    name: str
    domain: AgentDomain
    category: str
    description: str
    version: str = "1.0.0"
    jurisdictions: List[str] = field(default_factory=list)
    standards: List[str] = field(default_factory=list)
    capabilities: List[str] = field(default_factory=list)
    is_active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "domain": self.domain.value,
            "category": self.category,
            "description": self.description,
            "version": self.version,
            "jurisdictions": self.jurisdictions,
            "standards": self.standards,
            "capabilities": self.capabilities,
            "is_active": self.is_active,
        }


class AgentRegistry:
    """
    Central registry for all AI agents across domains.
    
    Provides:
    - Agent discovery and listing
    - Domain-based filtering
    - Capability matching
    - Jurisdiction-based routing
    """
    
    _instance: Optional['AgentRegistry'] = None
    _agents: Dict[str, AgentMetadata] = {}
    _initialized: bool = False
    
    def __new__(cls) -> 'AgentRegistry':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._register_all_agents()
            self._initialized = True
    
    def _register_all_agents(self):
        """Register all available agents from all domains"""
        self._register_tax_agents()
        self._register_accounting_agents()
        self._register_audit_agents()
        self._register_corporate_agents()
        logger.info(f"Agent registry initialized with {len(self._agents)} agents")
    
    def _register_tax_agents(self):
        """Register tax domain agents"""
        tax_agents = [
            AgentMetadata(
                agent_id="tax-corp-eu-027",
                name="EU Corporate Tax Specialist",
                domain=AgentDomain.TAX,
                category="corporate-tax",
                description="Expert in EU-27 corporate tax including ATAD I/II, DAC6, and EU directives",
                jurisdictions=["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"],
                capabilities=["corporate_tax", "eu_directives", "atad_compliance", "dac6"]
            ),
            AgentMetadata(
                agent_id="tax-corp-us-050",
                name="US Corporate Tax Specialist",
                domain=AgentDomain.TAX,
                category="corporate-tax",
                description="Expert in US federal and state corporate taxation including TCJA, GILTI, FDII",
                jurisdictions=["US"],
                capabilities=["corporate_tax", "federal_tax", "state_tax", "tcja", "gilti", "fdii"]
            ),
            AgentMetadata(
                agent_id="tax-corp-uk-025",
                name="UK Corporate Tax Specialist",
                domain=AgentDomain.TAX,
                category="corporate-tax",
                description="Expert in UK corporation tax including R&D credits, Patent Box, diverted profits tax",
                jurisdictions=["UK"],
                capabilities=["corporate_tax", "rd_credits", "patent_box", "dpt"]
            ),
            AgentMetadata(
                agent_id="tax-corp-ca-013",
                name="Canada Corporate Tax Specialist",
                domain=AgentDomain.TAX,
                category="corporate-tax",
                description="Expert in Canadian corporate tax including federal/provincial taxes and SR&ED credits",
                jurisdictions=["CA", "CA-ON", "CA-QC", "CA-BC", "CA-AB"],
                capabilities=["corporate_tax", "sred_credits", "provincial_tax"]
            ),
            AgentMetadata(
                agent_id="tax-corp-mt-003",
                name="Malta Corporate Tax Specialist",
                domain=AgentDomain.TAX,
                category="corporate-tax",
                description="Expert in Malta corporate tax including participation exemption, refund system, and holding company regime",
                jurisdictions=["MT"],
                capabilities=["malta_corporate_tax", "participation_exemption", "tax_refunds", "holding_company"]
            ),
            AgentMetadata(
                agent_id="tax-corp-rw-002",
                name="Rwanda Corporate Tax Specialist",
                domain=AgentDomain.TAX,
                category="corporate-tax",
                description="Expert in Rwanda corporate tax including EAC harmonization, IFRS alignment, and thin capitalization rules",
                jurisdictions=["RW"],
                capabilities=["rwanda_corporate_tax", "eac_compliance", "thin_capitalization", "investment_incentives"]
            ),
            AgentMetadata(
                agent_id="tax-tp-global-001",
                name="Transfer Pricing Specialist",
                domain=AgentDomain.TAX,
                category="transfer-pricing",
                description="Expert in OECD Transfer Pricing Guidelines, documentation requirements, and Country-by-Country Reporting",
                jurisdictions=["GLOBAL"],
                capabilities=["transfer_pricing", "oecd_guidelines", "cbc_reporting", "master_file", "local_file"]
            ),
            AgentMetadata(
                agent_id="tax-vat-global-001",
                name="VAT/GST Specialist",
                domain=AgentDomain.TAX,
                category="indirect-tax",
                description="Expert in multi-jurisdiction VAT/GST compliance including EU VAT, UK VAT, and global GST systems",
                jurisdictions=["EU", "UK", "AU", "NZ", "CA", "IN"],
                capabilities=["vat_compliance", "cross_border_vat", "moss_oss", "gst_compliance"]
            ),
            AgentMetadata(
                agent_id="tax-intl-global-001",
                name="International Tax Specialist",
                domain=AgentDomain.TAX,
                category="international-tax",
                description="Expert in BEPS compliance, tax treaties, withholding tax, and cross-border tax planning",
                jurisdictions=["GLOBAL"],
                capabilities=["beps_compliance", "tax_treaties", "withholding_tax", "pe_analysis"]
            ),
            AgentMetadata(
                agent_id="tax-comp-global-001",
                name="Tax Compliance Specialist",
                domain=AgentDomain.TAX,
                category="tax-compliance",
                description="Expert in tax filing deadlines, document preparation, and submission tracking across jurisdictions",
                jurisdictions=["GLOBAL"],
                capabilities=["filing_deadlines", "return_preparation", "compliance_tracking"]
            ),
            AgentMetadata(
                agent_id="tax-plan-global-001",
                name="Tax Planning Specialist",
                domain=AgentDomain.TAX,
                category="tax-planning",
                description="Expert in tax optimization strategies, scenario modeling, and risk assessment",
                jurisdictions=["GLOBAL"],
                capabilities=["tax_optimization", "scenario_modeling", "risk_assessment", "restructuring"]
            ),
            AgentMetadata(
                agent_id="tax-cont-global-001",
                name="Tax Controversy Specialist",
                domain=AgentDomain.TAX,
                category="tax-controversy",
                description="Expert in tax dispute resolution, appeals processes, and settlement negotiations",
                jurisdictions=["GLOBAL"],
                capabilities=["dispute_resolution", "audit_defense", "appeals", "settlement_negotiation"]
            ),
        ]
        
        for agent in tax_agents:
            self._agents[agent.agent_id] = agent
    
    def _register_accounting_agents(self):
        """Register accounting domain agents"""
        accounting_agents = [
            AgentMetadata(
                agent_id="acct-revenue-001",
                name="Revenue Recognition Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="revenue-recognition",
                description="Expert in revenue recognition under IFRS 15 and ASC 606",
                standards=["IFRS 15", "ASC 606"],
                capabilities=["revenue_recognition", "contract_analysis", "variable_consideration", "performance_obligations"]
            ),
            AgentMetadata(
                agent_id="acct-lease-001",
                name="Lease Accounting Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="lease-accounting",
                description="Expert in lease accounting under IFRS 16 and ASC 842",
                standards=["IFRS 16", "ASC 842"],
                capabilities=["lease_classification", "rou_asset_calculation", "lease_liability", "lease_modifications"]
            ),
            AgentMetadata(
                agent_id="acct-finstat-001",
                name="Financial Statements Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="financial-statements",
                description="Expert in financial statement preparation under IFRS and US GAAP",
                standards=["IAS 1", "ASC 205", "IAS 7"],
                capabilities=["balance_sheet_preparation", "income_statement", "cash_flow_statement", "equity_statement"]
            ),
            AgentMetadata(
                agent_id="acct-consol-001",
                name="Consolidation Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="consolidation",
                description="Expert in consolidated financial statements under IFRS 10 and ASC 810",
                standards=["IFRS 10", "IFRS 3", "ASC 810", "ASC 805"],
                capabilities=["control_assessment", "elimination_entries", "nci_calculation", "goodwill_calculation"]
            ),
            AgentMetadata(
                agent_id="acct-cashflow-001",
                name="Cash Flow Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="cash-flow",
                description="Expert in statement of cash flows under IAS 7 and ASC 230",
                standards=["IAS 7", "ASC 230"],
                capabilities=["direct_method", "indirect_method", "cash_classification", "non_cash_disclosures"]
            ),
            AgentMetadata(
                agent_id="acct-cost-001",
                name="Cost Accounting Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="cost-accounting",
                description="Expert in cost accounting and management accounting",
                standards=["IAS 2", "ASC 330"],
                capabilities=["job_costing", "process_costing", "abc_costing", "variance_analysis"]
            ),
            AgentMetadata(
                agent_id="acct-inventory-001",
                name="Inventory Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="inventory",
                description="Expert in inventory accounting under IAS 2 and ASC 330",
                standards=["IAS 2", "ASC 330"],
                capabilities=["inventory_valuation", "nrv_assessment", "cost_flow_methods", "inventory_count"]
            ),
            AgentMetadata(
                agent_id="acct-ppe-001",
                name="Fixed Assets Specialist",
                domain=AgentDomain.ACCOUNTING,
                category="fixed-assets",
                description="Expert in property, plant and equipment accounting under IAS 16 and ASC 360",
                standards=["IAS 16", "IAS 36", "ASC 360"],
                capabilities=["capitalization", "depreciation", "revaluation", "impairment"]
            ),
        ]
        
        for agent in accounting_agents:
            self._agents[agent.agent_id] = agent
    
    def _register_audit_agents(self):
        """Register audit domain agents (ISA-compliant)"""
        audit_agents = [
            AgentMetadata(
                agent_id="audit-planning-001",
                name="Audit Planning Specialist",
                domain=AgentDomain.AUDIT,
                category="planning",
                description="Expert in audit planning including materiality calculation and risk assessment",
                standards=["ISA 300", "ISA 315", "ISA 320"],
                capabilities=["audit_planning", "materiality_calculation", "risk_assessment", "audit_program"]
            ),
            AgentMetadata(
                agent_id="audit-risk-001",
                name="Risk Assessment Specialist",
                domain=AgentDomain.AUDIT,
                category="risk-assessment",
                description="Expert in audit risk assessment and significant risk identification",
                standards=["ISA 315", "ISA 330"],
                capabilities=["risk_assessment", "significant_risks", "control_environment", "inherent_risk"]
            ),
            AgentMetadata(
                agent_id="audit-substantive-001",
                name="Substantive Testing Specialist",
                domain=AgentDomain.AUDIT,
                category="substantive-testing",
                description="Expert in substantive audit procedures and sample design",
                standards=["ISA 500", "ISA 530"],
                capabilities=["substantive_procedures", "sample_design", "audit_evidence", "misstatement_projection"]
            ),
            AgentMetadata(
                agent_id="audit-controls-001",
                name="Internal Controls Specialist",
                domain=AgentDomain.AUDIT,
                category="internal-controls",
                description="Expert in internal control evaluation and testing",
                standards=["ISA 315", "ISA 330", "ISA 265"],
                capabilities=["control_design", "operating_effectiveness", "control_deficiencies", "management_letter"]
            ),
            AgentMetadata(
                agent_id="audit-fraud-001",
                name="Fraud Risk Specialist",
                domain=AgentDomain.AUDIT,
                category="fraud-risk",
                description="Expert in fraud risk assessment and journal entry testing",
                standards=["ISA 240"],
                capabilities=["fraud_risk_identification", "journal_entry_testing", "management_override", "fraud_indicators"]
            ),
            AgentMetadata(
                agent_id="audit-analytics-001",
                name="Audit Analytics Specialist",
                domain=AgentDomain.AUDIT,
                category="analytics",
                description="Expert in audit analytics including Benford's law and outlier detection",
                standards=["ISA 520"],
                capabilities=["benford_analysis", "outlier_detection", "analytical_procedures", "data_analytics"]
            ),
            AgentMetadata(
                agent_id="audit-group-001",
                name="Group Audit Specialist",
                domain=AgentDomain.AUDIT,
                category="group-audit",
                description="Expert in group audits and component auditor coordination",
                standards=["ISA 600"],
                capabilities=["component_classification", "materiality_allocation", "component_instructions", "consolidation_audit"]
            ),
            AgentMetadata(
                agent_id="audit-completion-001",
                name="Audit Completion Specialist",
                domain=AgentDomain.AUDIT,
                category="completion",
                description="Expert in audit completion procedures and going concern assessment",
                standards=["ISA 560", "ISA 570", "ISA 580"],
                capabilities=["going_concern", "subsequent_events", "written_representations", "completion_memo"]
            ),
            AgentMetadata(
                agent_id="audit-quality-001",
                name="Quality Review Specialist",
                domain=AgentDomain.AUDIT,
                category="quality-review",
                description="Expert in engagement quality review and independence assessment",
                standards=["ISQM 1", "ISQM 2"],
                capabilities=["quality_review", "independence_assessment", "significant_judgments", "eqr"]
            ),
            AgentMetadata(
                agent_id="audit-report-001",
                name="Audit Report Specialist",
                domain=AgentDomain.AUDIT,
                category="reporting",
                description="Expert in audit report formulation and key audit matters",
                standards=["ISA 700", "ISA 701", "ISA 705", "ISA 706"],
                capabilities=["opinion_formulation", "key_audit_matters", "report_modifications", "emphasis_of_matter"]
            ),
        ]
        
        for agent in audit_agents:
            self._agents[agent.agent_id] = agent
    
    def _register_corporate_agents(self):
        """Register corporate services domain agents"""
        corporate_agents = [
            AgentMetadata(
                agent_id="corp-formation-001",
                name="Company Formation Specialist",
                domain=AgentDomain.CORPORATE,
                category="formation",
                description="Expert in company formation and incorporation across jurisdictions",
                jurisdictions=["MT", "RW", "UK", "US", "EU"],
                capabilities=["company_formation", "incorporation", "document_preparation", "regulatory_filing"]
            ),
            AgentMetadata(
                agent_id="corp-governance-001",
                name="Corporate Governance Specialist",
                domain=AgentDomain.CORPORATE,
                category="governance",
                description="Expert in corporate governance, board matters, and compliance",
                capabilities=["board_governance", "compliance_monitoring", "statutory_obligations", "corporate_secretary"]
            ),
            AgentMetadata(
                agent_id="corp-secretary-001",
                name="Company Secretary Specialist",
                domain=AgentDomain.CORPORATE,
                category="secretarial",
                description="Expert in company secretarial services and statutory compliance",
                capabilities=["annual_returns", "register_maintenance", "statutory_filings", "meeting_management"]
            ),
            AgentMetadata(
                agent_id="corp-compliance-001",
                name="Regulatory Compliance Specialist",
                domain=AgentDomain.CORPORATE,
                category="compliance",
                description="Expert in regulatory compliance across jurisdictions",
                capabilities=["regulatory_compliance", "license_management", "compliance_calendar", "regulatory_reporting"]
            ),
        ]
        
        for agent in corporate_agents:
            self._agents[agent.agent_id] = agent
    
    # Public API methods
    def get_agent(self, agent_id: str) -> Optional[AgentMetadata]:
        """Get agent by ID"""
        return self._agents.get(agent_id)
    
    def list_agents(
        self,
        domain: Optional[AgentDomain] = None,
        category: Optional[str] = None,
        jurisdiction: Optional[str] = None,
        capability: Optional[str] = None,
        is_active: bool = True
    ) -> List[Dict[str, Any]]:
        """
        List agents with optional filters.
        
        Args:
            domain: Filter by domain (tax, accounting, audit, corporate)
            category: Filter by category
            jurisdiction: Filter by jurisdiction
            capability: Filter by capability
            is_active: Filter by active status
            
        Returns:
            List of agent metadata dictionaries
        """
        results = []
        
        for agent in self._agents.values():
            if is_active and not agent.is_active:
                continue
            if domain and agent.domain != domain:
                continue
            if category and agent.category != category:
                continue
            if jurisdiction:
                if jurisdiction not in agent.jurisdictions and "GLOBAL" not in agent.jurisdictions:
                    continue
            if capability and capability not in agent.capabilities:
                continue
            
            results.append(agent.to_dict())
        
        return results
    
    def discover_agents(
        self,
        query: str,
        jurisdiction: Optional[str] = None,
        domain: Optional[AgentDomain] = None
    ) -> List[Dict[str, Any]]:
        """
        Discover agents based on query text and filters.
        
        Analyzes the query to find the most relevant agents.
        
        Args:
            query: Search query text
            jurisdiction: Optional jurisdiction filter
            domain: Optional domain filter
            
        Returns:
            List of matching agents sorted by relevance
        """
        query_lower = query.lower()
        scored_agents = []
        
        for agent in self._agents.values():
            if not agent.is_active:
                continue
            if domain and agent.domain != domain:
                continue
            if jurisdiction and jurisdiction not in agent.jurisdictions and "GLOBAL" not in agent.jurisdictions:
                continue
            
            score = 0
            
            # Score based on name match
            if query_lower in agent.name.lower():
                score += 10
            
            # Score based on category match
            if query_lower in agent.category.lower():
                score += 5
            
            # Score based on description match
            description_lower = agent.description.lower()
            for word in query_lower.split():
                if word in description_lower:
                    score += 2
            
            # Score based on capability match
            for cap in agent.capabilities:
                if query_lower in cap.lower():
                    score += 3
            
            if score > 0:
                scored_agents.append((score, agent.to_dict()))
        
        # Sort by score descending
        scored_agents.sort(key=lambda x: x[0], reverse=True)
        
        return [agent for _, agent in scored_agents]
    
    def get_agents_by_jurisdiction(self, jurisdiction: str) -> List[Dict[str, Any]]:
        """Get all agents that support a specific jurisdiction"""
        return self.list_agents(jurisdiction=jurisdiction)
    
    def get_agents_by_capability(self, capability: str) -> List[Dict[str, Any]]:
        """Get all agents with a specific capability"""
        return self.list_agents(capability=capability)
    
    def count_agents(self, domain: Optional[AgentDomain] = None) -> int:
        """Count agents, optionally filtered by domain"""
        if domain:
            return sum(1 for a in self._agents.values() if a.domain == domain)
        return len(self._agents)


# Singleton instance
_registry: Optional[AgentRegistry] = None


def get_agent_registry() -> AgentRegistry:
    """Get the global agent registry instance"""
    global _registry
    if _registry is None:
        _registry = AgentRegistry()
    return _registry


def list_all_agents(**filters) -> List[Dict[str, Any]]:
    """Convenience function to list all agents with filters"""
    return get_agent_registry().list_agents(**filters)


def discover_agents(query: str, **filters) -> List[Dict[str, Any]]:
    """Convenience function to discover agents"""
    return get_agent_registry().discover_agents(query, **filters)

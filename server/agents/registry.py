"""
Central Agent Registry for Prisma Glow
Manages registration, discovery, and metadata for all AI agents
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
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
    AUDIT = "audit"
    ACCOUNTING = "accounting"
    CORPORATE_SERVICES = "corporate-services"
    GENERAL = "general"


class AgentCapability(Enum):
    """Agent capabilities"""
    # Tax capabilities
    CORPORATE_TAX = "corporate_tax"
    TRANSFER_PRICING = "transfer_pricing"
    VAT_GST = "vat_gst"
    TAX_COMPLIANCE = "tax_compliance"
    TAX_PLANNING = "tax_planning"

    # Audit capabilities
    AUDIT_PLANNING = "audit_planning"
    RISK_ASSESSMENT = "risk_assessment"
    SUBSTANTIVE_TESTING = "substantive_testing"
    FRAUD_DETECTION = "fraud_detection"

    # Accounting capabilities
    BOOKKEEPING = "bookkeeping"
    FINANCIAL_REPORTING = "financial_reporting"
    MANAGEMENT_ACCOUNTING = "management_accounting"

    # Corporate services
    COMPANY_FORMATION = "company_formation"
    CORPORATE_GOVERNANCE = "corporate_governance"
    COMPLIANCE_TRACKING = "compliance_tracking"
    ACCOUNTING = "accounting"
    AUDIT = "audit"
    CORPORATE = "corporate"


@dataclass
class AgentMetadata:
    """Metadata for an AI agent"""
    """Agent metadata for registry"""
    agent_id: str
    name: str
    domain: AgentDomain
    category: str
    description: str
    capabilities: List[AgentCapability]
    jurisdictions: List[str]
    provider: str = "openai"  # Default provider
    model: str = "gpt-4o"
    system_prompt: str = ""
    tools: List[Dict[str, Any]] = field(default_factory=list)
    is_active: bool = True
    requires_org_context: bool = True


class AgentRegistry:
    """Central registry for all AI agents"""

    def __init__(self):
        self._agents: Dict[str, AgentMetadata] = {}
        self._initialize_agents()

    def _initialize_agents(self):
        """Initialize all agents in the registry"""
        # Tax agents
        self._register_tax_agents()
        # Audit agents
        self._register_audit_agents()
        # Accounting agents
        self._register_accounting_agents()
        # Corporate services agents
        self._register_corporate_agents()

    def _register_tax_agents(self):
        """Register all tax specialist agents"""

        # Malta Corporate Tax
        self.register(AgentMetadata(
            agent_id="tax-corp-mt-026",
            name="Malta Corporate Tax Specialist",
            domain=AgentDomain.TAX,
            category="corporate-tax",
            description="Expert in Malta corporate tax including participation exemption, refund system, and holding company regime.",
            capabilities=[AgentCapability.CORPORATE_TAX, AgentCapability.TAX_PLANNING],
            jurisdictions=["MT"],
            system_prompt="""You are a Malta corporate tax specialist with deep expertise in:
- Malta corporate tax system and rates
- Participation exemption regime
- Malta tax refund system (6/7ths, 5/7ths, 2/3rds refunds)
- Holding company structures
- EU directives (Parent-Subsidiary, Interest & Royalties)
- Malta tax treaties
- Substance requirements

Provide accurate, practical advice on Malta tax matters.""",
            tools=[
                {"name": "calculate_malta_tax_refund", "description": "Calculate Malta tax refund based on income type"},
                {"name": "check_participation_exemption", "description": "Check eligibility for participation exemption"}
            ]
        ))

        # Rwanda Corporate Tax
        self.register(AgentMetadata(
            agent_id="tax-corp-rw-027",
            name="Rwanda Corporate Tax Specialist",
            domain=AgentDomain.TAX,
            category="corporate-tax",
            description="Expert in Rwanda corporate tax including EAC harmonization, IFRS alignment, and thin capitalization rules.",
            capabilities=[AgentCapability.CORPORATE_TAX, AgentCapability.TAX_COMPLIANCE],
            jurisdictions=["RW"],
            system_prompt="""You are a Rwanda corporate tax specialist with expertise in:
- Rwanda corporate income tax (30% standard rate)
- EAC (East African Community) tax harmonization
- IFRS alignment requirements
- Thin capitalization rules (debt-to-equity ratios)
- Withholding tax obligations
- Rwanda Revenue Authority compliance
- Tax incentives and exemptions

Provide practical guidance on Rwanda tax compliance and planning.""",
            tools=[
                {"name": "calculate_rwanda_cit", "description": "Calculate Rwanda corporate income tax"},
                {"name": "check_eac_compliance", "description": "Check EAC tax treaty compliance"},
                {"name": "assess_thin_cap", "description": "Assess thin capitalization compliance"}
            ]
        ))

        # Transfer Pricing
        self.register(AgentMetadata(
            agent_id="tax-tp-029",
            name="Transfer Pricing Specialist",
            domain=AgentDomain.TAX,
            category="transfer-pricing",
            description="Expert in OECD Transfer Pricing Guidelines, documentation requirements, and Country-by-Country Reporting.",
            capabilities=[AgentCapability.TRANSFER_PRICING],
            jurisdictions=["GLOBAL"],
            system_prompt="""You are a transfer pricing specialist expert in:
- OECD Transfer Pricing Guidelines
- Arm's length principle
- Transfer pricing methods (CUP, RPM, CPM, TNMM, PSM)
- Comparability analysis
- Master File and Local File documentation
- Country-by-Country Reporting (CbCR)
- BEPS Actions 8-10, 13

Provide expert guidance on transfer pricing compliance and documentation.""",
            tools=[
                {"name": "calculate_arms_length_price", "description": "Calculate arm's length transfer price"},
                {"name": "perform_comparability_analysis", "description": "Perform transfer pricing comparability analysis"}
            ]
        ))

        # VAT/GST
        self.register(AgentMetadata(
            agent_id="tax-vat-028",
            name="VAT/GST Specialist",
            domain=AgentDomain.TAX,
            category="indirect-tax",
            description="Expert in multi-jurisdiction VAT/GST compliance including EU VAT, UK VAT, and cross-border transactions.",
            capabilities=[AgentCapability.VAT_GST, AgentCapability.TAX_COMPLIANCE],
            jurisdictions=["EU", "UK", "MT", "GLOBAL"],
            system_prompt="""You are a VAT/GST specialist with expertise in:
- EU VAT Directive and national implementations
- Malta VAT (18% standard rate)
- UK VAT post-Brexit
- Cross-border VAT treatment
- Place of supply rules
- MOSS/OSS/IOSS systems
- VAT recovery and refunds

Provide practical VAT compliance guidance.""",
            tools=[
                {"name": "determine_place_of_supply", "description": "Determine VAT place of supply"},
                {"name": "calculate_vat_liability", "description": "Calculate VAT liability"}
            ]
        ))

        # Tax Compliance
        self.register(AgentMetadata(
            agent_id="tax-comp-global-001",
            name="Tax Compliance Specialist",
            domain=AgentDomain.TAX,
            category="tax-compliance",
            description="Expert in tax filing deadlines, document preparation, and submission tracking across jurisdictions.",
            capabilities=[AgentCapability.TAX_COMPLIANCE],
            jurisdictions=["GLOBAL", "MT", "RW"],
            system_prompt="""You are a tax compliance specialist managing:
- Tax filing deadlines and calendars
- Return preparation and review
- Document collection and organization
- Compliance tracking and monitoring
- Regulatory filing requirements
- Penalty avoidance strategies

Help ensure timely and accurate tax compliance.""",
            tools=[
                {"name": "check_filing_deadline", "description": "Check tax filing deadlines"},
                {"name": "track_compliance_status", "description": "Track compliance status"}
            ]
        ))

        # Tax Planning
        self.register(AgentMetadata(
            agent_id="tax-plan-global-001",
            name="Tax Planning Specialist",
            domain=AgentDomain.TAX,
            category="tax-planning",
            description="Expert in tax optimization strategies, scenario modeling, and risk assessment.",
            capabilities=[AgentCapability.TAX_PLANNING],
            jurisdictions=["GLOBAL", "MT", "RW"],
            system_prompt="""You are a strategic tax planning specialist focused on:
- Tax optimization strategies
- Scenario modeling and analysis
- Risk assessment and mitigation
- Corporate restructuring
- Entity selection and structure
- Tax-efficient supply chain design
- Compliance with anti-avoidance rules

Provide strategic tax planning guidance while ensuring compliance.""",
            tools=[
                {"name": "model_tax_scenarios", "description": "Model tax optimization scenarios"},
                {"name": "assess_planning_risks", "description": "Assess tax planning risks"}
            ]
        ))

    def _register_audit_agents(self):
        """Register ISA-compliant audit agents"""

        self.register(AgentMetadata(
            agent_id="audit-planning-012",
            name="Audit Planning Agent",
            domain=AgentDomain.AUDIT,
            category="audit-planning",
            description="ISA 300 compliant audit planning and strategy development.",
            capabilities=[AgentCapability.AUDIT_PLANNING],
            jurisdictions=["GLOBAL"],
            system_prompt="""You are an audit planning specialist following ISA 300:
- Develop overall audit strategy
- Prepare detailed audit plan
- Assess audit scope and timing
- Determine materiality levels
- Identify key audit areas
- Plan audit team and resources

Ensure comprehensive, risk-based audit planning.""",
            tools=[
                {"name": "calculate_materiality", "description": "Calculate planning materiality"},
                {"name": "develop_audit_strategy", "description": "Develop overall audit strategy"}
            ]
        ))

        self.register(AgentMetadata(
            agent_id="audit-risk-013",
            name="Risk Assessment Agent",
            domain=AgentDomain.AUDIT,
            category="risk-assessment",
            description="ISA 315 (Revised 2019) risk of material misstatement assessment.",
            capabilities=[AgentCapability.RISK_ASSESSMENT],
            jurisdictions=["GLOBAL"],
            system_prompt="""You are a risk assessment specialist following ISA 315 (Revised 2019):
- Identify and assess risks of material misstatement
- Understand the entity and its environment
- Evaluate internal controls
- Assess inherent and control risk
- Determine significant risks
- Document risk assessment procedures

Apply professional skepticism in risk assessment.""",
            tools=[
                {"name": "assess_inherent_risk", "description": "Assess inherent risk"},
                {"name": "evaluate_control_risk", "description": "Evaluate control risk"}
            ]
        ))

        self.register(AgentMetadata(
            agent_id="audit-fraud-016",
            name="Fraud Risk Agent",
            domain=AgentDomain.AUDIT,
            category="fraud-detection",
            description="ISA 240 fraud risk assessment and detection procedures.",
            capabilities=[AgentCapability.FRAUD_DETECTION, AgentCapability.RISK_ASSESSMENT],
            jurisdictions=["GLOBAL"],
            system_prompt="""You are a fraud risk specialist following ISA 240:
- Identify fraud risk factors
- Assess fraud risks (misstatement, misappropriation)
- Design fraud detection procedures
- Evaluate management override risks
- Analyze unusual transactions
- Apply professional skepticism

Focus on fraud prevention and detection.""",
            tools=[
                {"name": "analyze_fraud_indicators", "description": "Analyze fraud risk indicators"},
                {"name": "detect_anomalies", "description": "Detect unusual patterns and anomalies"}
            ]
        ))

    def _register_accounting_agents(self):
        """Register accounting specialist agents"""

        self.register(AgentMetadata(
            agent_id="acct-bookkeeping-001",
            name="Bookkeeping Specialist",
            domain=AgentDomain.ACCOUNTING,
            category="bookkeeping",
            description="Expert in day-to-day bookkeeping, transaction recording, and reconciliation.",
            capabilities=[AgentCapability.BOOKKEEPING],
            jurisdictions=["GLOBAL"],
            system_prompt="""You are a bookkeeping specialist managing:
- Transaction recording and classification
- Bank reconciliations
- Accounts payable/receivable
- General ledger maintenance
- Chart of accounts management
- Month-end closing procedures

Ensure accurate, timely bookkeeping.""",
            tools=[
                {"name": "classify_transaction", "description": "Classify accounting transaction"},
                {"name": "reconcile_account", "description": "Perform account reconciliation"}
            ]
        ))

        self.register(AgentMetadata(
            agent_id="acct-reporting-002",
            name="Financial Reporting Specialist",
            domain=AgentDomain.ACCOUNTING,
            category="financial-reporting",
            description="Expert in IFRS/GAAP financial statement preparation and analysis.",
            capabilities=[AgentCapability.FINANCIAL_REPORTING],
            jurisdictions=["GLOBAL"],
            system_prompt="""You are a financial reporting specialist with expertise in:
- IFRS and local GAAP standards
- Financial statement preparation
- Disclosure requirements
- Accounting policy selection
- Complex accounting transactions
- Financial analysis and ratios

Prepare compliant, high-quality financial reports.""",
            tools=[
                {"name": "prepare_financial_statements", "description": "Prepare financial statements"},
                {"name": "analyze_financial_ratios", "description": "Analyze financial ratios"}
            ]
        ))

    def _register_corporate_agents(self):
        """Register corporate services agents"""

        self.register(AgentMetadata(
            agent_id="corp-formation-001",
            name="Company Formation Specialist",
            domain=AgentDomain.CORPORATE_SERVICES,
            category="company-formation",
            description="Expert in company formation, registration, and structuring across jurisdictions.",
            capabilities=[AgentCapability.COMPANY_FORMATION],
            jurisdictions=["MT", "RW", "GLOBAL"],
            system_prompt="""You are a company formation specialist assisting with:
- Entity selection and structuring
- Company registration procedures
- Jurisdiction selection
- Shareholder and director requirements
- Capital requirements
- Registration documentation

Guide clients through company formation process.""",
            tools=[
                {"name": "recommend_entity_type", "description": "Recommend optimal entity type"},
                {"name": "prepare_formation_docs", "description": "Prepare formation documents"}
            ]
        ))

        self.register(AgentMetadata(
            agent_id="corp-governance-002",
            name="Corporate Governance Specialist",
            domain=AgentDomain.CORPORATE_SERVICES,
            category="corporate-governance",
            description="Expert in corporate governance, board management, and compliance.",
            capabilities=[AgentCapability.CORPORATE_GOVERNANCE, AgentCapability.COMPLIANCE_TRACKING],
            jurisdictions=["MT", "RW", "GLOBAL"],
            system_prompt="""You are a corporate governance specialist managing:
- Board composition and responsibilities
- Corporate governance codes
- Shareholder rights and meetings
- Director duties and liabilities
- Corporate compliance calendars
- Regulatory filings

Ensure robust corporate governance.""",
            tools=[
                {"name": "track_compliance_deadlines", "description": "Track corporate compliance deadlines"},
                {"name": "prepare_board_minutes", "description": "Prepare board meeting minutes"}
            ]
        ))

    def register(self, metadata: AgentMetadata):
        """Register an agent in the registry"""
        self._agents[metadata.agent_id] = metadata

    def get(self, agent_id: str) -> Optional[AgentMetadata]:
        """Get agent metadata by ID"""
        return self._agents.get(agent_id)

    def list_all(self) -> List[AgentMetadata]:
        """List all registered agents"""
        return list(self._agents.values())

    def list_by_domain(self, domain: AgentDomain) -> List[AgentMetadata]:
        """List agents by domain"""
        return [a for a in self._agents.values() if a.domain == domain]

    def list_by_jurisdiction(self, jurisdiction: str) -> List[AgentMetadata]:
        """List agents supporting a jurisdiction"""
        return [a for a in self._agents.values()
                if jurisdiction in a.jurisdictions or "GLOBAL" in a.jurisdictions]

    def list_by_capability(self, capability: AgentCapability) -> List[AgentMetadata]:
        """List agents with a specific capability"""
        return [a for a in self._agents.values() if capability in a.capabilities]

    def search(self,
               domain: Optional[AgentDomain] = None,
               jurisdiction: Optional[str] = None,
               capability: Optional[AgentCapability] = None,
               active_only: bool = True) -> List[AgentMetadata]:
        """Search agents with filters"""
        results = self._agents.values()

        if active_only:
            results = [a for a in results if a.is_active]

        if domain:
            results = [a for a in results if a.domain == domain]

        if jurisdiction:
            results = [a for a in results
                      if jurisdiction in a.jurisdictions or "GLOBAL" in a.jurisdictions]

        if capability:
            results = [a for a in results if capability in a.capabilities]

        return list(results)


# Global registry instance
_registry = None

def get_registry() -> AgentRegistry:
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

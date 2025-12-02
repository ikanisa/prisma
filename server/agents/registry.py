"""
Central Agent Registry for Prisma Glow
Manages registration, discovery, and metadata for all AI agents
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


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


@dataclass
class AgentMetadata:
    """Metadata for an AI agent"""
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
    """Get the global agent registry instance"""
    global _registry
    if _registry is None:
        _registry = AgentRegistry()
    return _registry

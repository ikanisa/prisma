"""
Central Tool Registry
Maps tool names to their Python implementations
"""
from typing import Callable, Dict, Any, Optional
import structlog

# Import domain tools
from server.agents.tax.malta_tools import (
    calculate_malta_tax_refund,
    check_participation_exemption,
    calculate_corporate_tax
)
from server.agents.tax.rwanda_tools import (
    calculate_rwanda_cit,
    check_eac_compliance,
    assess_thin_cap
)
from server.agents.accounting.bookkeeping_tools import (
    classify_transaction,
    reconcile_account
)
from server.agents.accounting.reporting_tools import (
    prepare_financial_statements,
    analyze_financial_ratios
)
from server.agents.audit.planning_tools import (
    calculate_materiality,
    develop_audit_strategy
)
from server.agents.audit.risk_tools import (
    assess_inherent_risk,
    evaluate_control_risk,
    analyze_fraud_indicators
)
from server.agents.corporate.formation_tools import (
    recommend_entity_type,
    prepare_formation_docs
)
from server.agents.corporate.governance_tools import (
    track_compliance_deadlines,
    prepare_board_minutes
)

logger = structlog.get_logger().bind(component="tool_registry")

class ToolRegistry:
    """Registry for agent tool implementations"""

    _tools: Dict[str, Callable] = {}

    @classmethod
    def register(cls, name: str, func: Callable):
        """Register a tool implementation"""
        cls._tools[name] = func
        logger.debug("tool_registered", name=name)

    @classmethod
    def get_handler(cls, name: str) -> Optional[Callable]:
        """Get tool handler by name"""
        return cls._tools.get(name)

    @classmethod
    def initialize(cls):
        """Initialize registry with all available tools"""
        # Malta Tax Tools
        cls.register("calculate_malta_tax_refund", calculate_malta_tax_refund)
        cls.register("check_participation_exemption", check_participation_exemption)
        cls.register("calculate_corporate_tax", calculate_corporate_tax)

        # Rwanda Tax Tools
        cls.register("calculate_rwanda_cit", calculate_rwanda_cit)
        cls.register("check_eac_compliance", check_eac_compliance)
        cls.register("assess_thin_cap", assess_thin_cap)

        # Accounting Tools
        cls.register("classify_transaction", classify_transaction)
        cls.register("reconcile_account", reconcile_account)
        cls.register("prepare_financial_statements", prepare_financial_statements)
        cls.register("analyze_financial_ratios", analyze_financial_ratios)

        # Audit Tools
        cls.register("calculate_materiality", calculate_materiality)
        cls.register("develop_audit_strategy", develop_audit_strategy)
        cls.register("assess_inherent_risk", assess_inherent_risk)
        cls.register("evaluate_control_risk", evaluate_control_risk)
        cls.register("analyze_fraud_indicators", analyze_fraud_indicators)

        # Corporate Services Tools
        cls.register("recommend_entity_type", recommend_entity_type)
        cls.register("prepare_formation_docs", prepare_formation_docs)
        cls.register("track_compliance_deadlines", track_compliance_deadlines)
        cls.register("prepare_board_minutes", prepare_board_minutes)

        logger.info("tool_registry_initialized", count=len(cls._tools))

# Initialize on module load
ToolRegistry.initialize()

def get_tool_handler(name: str) -> Optional[Callable]:
    """Helper to get tool handler"""
    return ToolRegistry.get_handler(name)

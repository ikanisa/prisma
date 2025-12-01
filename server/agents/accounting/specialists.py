"""
Accounting Specialist Agents
Revenue Recognition, Lease Accounting, Financial Statements, and more.
"""
from typing import Dict, Any, List
from .base import BaseAccountingAgent


class RevenueRecognitionAgent(BaseAccountingAgent):
    """Revenue Recognition Specialist (IFRS 15 / ASC 606)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-revenue-001"
    
    @property
    def name(self) -> str:
        return "Revenue Recognition Specialist"
    
    @property
    def category(self) -> str:
        return "revenue-recognition"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Revenue Recognition Specialist",
            "role": "Senior Accounting Advisor - Revenue",
            "system_prompt": """Expert in revenue recognition under IFRS 15 and ASC 606.
Specializes in the five-step model for revenue recognition, variable consideration,
contract modifications, and principal vs. agent considerations.""",
            "capabilities": [
                "revenue_recognition",
                "contract_analysis",
                "variable_consideration",
                "performance_obligations"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "identify_performance_obligations",
                "description": "Identify distinct performance obligations in a contract"
            },
            {
                "name": "allocate_transaction_price",
                "description": "Allocate transaction price to performance obligations"
            },
            {
                "name": "calculate_variable_consideration",
                "description": "Calculate expected or most likely variable consideration"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IFRS 15", "ASC 606"]


class LeaseAccountingAgent(BaseAccountingAgent):
    """Lease Accounting Specialist (IFRS 16 / ASC 842)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-lease-001"
    
    @property
    def name(self) -> str:
        return "Lease Accounting Specialist"
    
    @property
    def category(self) -> str:
        return "lease-accounting"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Lease Accounting Specialist",
            "role": "Senior Accounting Advisor - Leases",
            "system_prompt": """Expert in lease accounting under IFRS 16 and ASC 842.
Specializes in lease classification, right-of-use asset calculation,
lease liability measurement, and lease modifications.""",
            "capabilities": [
                "lease_classification",
                "rou_asset_calculation",
                "lease_liability",
                "lease_modifications"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_rou_asset",
                "description": "Calculate right-of-use asset at commencement"
            },
            {
                "name": "calculate_lease_liability",
                "description": "Calculate initial lease liability"
            },
            {
                "name": "classify_lease",
                "description": "Determine finance vs. operating lease classification"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IFRS 16", "ASC 842"]


class FinancialStatementsAgent(BaseAccountingAgent):
    """Financial Statements Specialist (IAS 1 / ASC 205)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-finstat-001"
    
    @property
    def name(self) -> str:
        return "Financial Statements Specialist"
    
    @property
    def category(self) -> str:
        return "financial-statements"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Financial Statements Specialist",
            "role": "Senior Accounting Advisor - Financial Reporting",
            "system_prompt": """Expert in financial statement preparation under IFRS and US GAAP.
Specializes in statement of financial position, income statement,
cash flow statement, and statement of changes in equity.""",
            "capabilities": [
                "balance_sheet_preparation",
                "income_statement",
                "cash_flow_statement",
                "equity_statement"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "prepare_balance_sheet",
                "description": "Prepare statement of financial position"
            },
            {
                "name": "prepare_income_statement",
                "description": "Prepare statement of profit or loss"
            },
            {
                "name": "prepare_cash_flow",
                "description": "Prepare statement of cash flows"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 1", "ASC 205", "IAS 7"]


class ConsolidationAgent(BaseAccountingAgent):
    """Consolidation Specialist (IFRS 10 / ASC 810)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-consol-001"
    
    @property
    def name(self) -> str:
        return "Consolidation Specialist"
    
    @property
    def category(self) -> str:
        return "consolidation"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Consolidation Specialist",
            "role": "Senior Accounting Advisor - Consolidation",
            "system_prompt": """Expert in consolidated financial statements under IFRS 10 and ASC 810.
Specializes in control assessment, elimination entries,
non-controlling interests, and business combinations.""",
            "capabilities": [
                "control_assessment",
                "elimination_entries",
                "nci_calculation",
                "goodwill_calculation"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "assess_control",
                "description": "Determine if control exists for consolidation"
            },
            {
                "name": "calculate_nci",
                "description": "Calculate non-controlling interest"
            },
            {
                "name": "prepare_eliminations",
                "description": "Prepare intercompany elimination entries"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IFRS 10", "IFRS 3", "ASC 810", "ASC 805"]


class CashFlowAgent(BaseAccountingAgent):
    """Cash Flow Statement Specialist (IAS 7)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-cashflow-001"
    
    @property
    def name(self) -> str:
        return "Cash Flow Specialist"
    
    @property
    def category(self) -> str:
        return "cash-flow"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Cash Flow Specialist",
            "role": "Senior Accounting Advisor - Cash Flows",
            "system_prompt": """Expert in statement of cash flows under IAS 7 and ASC 230.
Specializes in direct and indirect methods, operating/investing/financing
classifications, and non-cash transaction disclosures.""",
            "capabilities": [
                "direct_method",
                "indirect_method",
                "cash_classification",
                "non_cash_disclosures"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "prepare_indirect_cashflow",
                "description": "Prepare cash flow using indirect method"
            },
            {
                "name": "classify_cash_activity",
                "description": "Classify as operating, investing, or financing"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 7", "ASC 230"]
    
    def _suggest_actions(
        self,
        query: str,
        context: Dict[str, Any] = None
    ) -> List[str]:
        return [
            "Review non-cash investing and financing activities",
            "Reconcile cash flow to change in cash balance",
            "Prepare supplemental disclosure of interest and taxes paid"
        ]


class CostAccountingAgent(BaseAccountingAgent):
    """Cost Accounting Specialist"""
    
    @property
    def agent_id(self) -> str:
        return "acct-cost-001"
    
    @property
    def name(self) -> str:
        return "Cost Accounting Specialist"
    
    @property
    def category(self) -> str:
        return "cost-accounting"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Cost Accounting Specialist",
            "role": "Senior Cost Accountant",
            "system_prompt": """Expert in cost accounting and management accounting.
Specializes in job costing, process costing, activity-based costing,
standard costing, and variance analysis.""",
            "capabilities": [
                "job_costing",
                "process_costing",
                "abc_costing",
                "variance_analysis"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_product_cost",
                "description": "Calculate full product cost"
            },
            {
                "name": "analyze_variances",
                "description": "Perform variance analysis"
            },
            {
                "name": "calculate_overhead_rate",
                "description": "Calculate overhead absorption rate"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 2", "ASC 330"]


class InventoryAgent(BaseAccountingAgent):
    """Inventory Accounting Specialist (IAS 2 / ASC 330)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-inventory-001"
    
    @property
    def name(self) -> str:
        return "Inventory Specialist"
    
    @property
    def category(self) -> str:
        return "inventory"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Inventory Specialist",
            "role": "Senior Accounting Advisor - Inventory",
            "system_prompt": """Expert in inventory accounting under IAS 2 and ASC 330.
Specializes in inventory valuation methods (FIFO, weighted average),
NRV write-downs, and cost flow assumptions.""",
            "capabilities": [
                "inventory_valuation",
                "nrv_assessment",
                "cost_flow_methods",
                "inventory_count"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_inventory_cost",
                "description": "Calculate inventory cost using specified method"
            },
            {
                "name": "assess_nrv",
                "description": "Assess net realizable value for write-down"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 2", "ASC 330"]


class FixedAssetsAgent(BaseAccountingAgent):
    """Fixed Assets / PPE Specialist (IAS 16 / ASC 360)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-ppe-001"
    
    @property
    def name(self) -> str:
        return "Fixed Assets Specialist"
    
    @property
    def category(self) -> str:
        return "fixed-assets"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Fixed Assets Specialist",
            "role": "Senior Accounting Advisor - PPE",
            "system_prompt": """Expert in property, plant and equipment accounting under IAS 16 and ASC 360.
Specializes in capitalization criteria, depreciation methods,
revaluation model, and impairment testing.""",
            "capabilities": [
                "capitalization",
                "depreciation",
                "revaluation",
                "impairment"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_depreciation",
                "description": "Calculate depreciation using specified method"
            },
            {
                "name": "test_impairment",
                "description": "Perform impairment test for PPE"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 16", "IAS 36", "ASC 360"]

"""
Additional Accounting Specialist Agents
Financial Instruments, Income Taxes, Employee Benefits, Provisions,
Impairment, FX, Share-based Payments, and Agriculture.
"""
from typing import Dict, Any, List
from .base import BaseAccountingAgent


class FinancialInstrumentsAgent(BaseAccountingAgent):
    """Financial Instruments & Hedging Specialist (IFRS 9 / IFRS 7 / IAS 32 / ASC 815)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-fininst-001"
    
    @property
    def name(self) -> str:
        return "Financial Instruments & Hedging Specialist"
    
    @property
    def category(self) -> str:
        return "financial-instruments"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Financial Instruments & Hedging Specialist",
            "role": "Senior Accounting Advisor - Financial Instruments",
            "system_prompt": """Expert in financial instruments accounting under IFRS 9, IFRS 7, IAS 32, and ASC 815/820/825.
Specializes in classification and measurement (amortised cost, FVOCI, FVTPL),
expected credit loss (ECL) models, hedge accounting documentation and effectiveness testing.""",
            "capabilities": [
                "classification_measurement",
                "ecl_impairment",
                "hedge_accounting",
                "fair_value_measurement"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "classify_financial_asset",
                "description": "Classify financial assets based on business model and SPPI test"
            },
            {
                "name": "calculate_ecl",
                "description": "Calculate expected credit loss under IFRS 9"
            },
            {
                "name": "test_hedge_effectiveness",
                "description": "Test hedge effectiveness prospectively and retrospectively"
            },
            {
                "name": "determine_fair_value",
                "description": "Determine fair value hierarchy level and measurement"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IFRS 9", "IFRS 7", "IFRS 13", "IAS 32", "ASC 815", "ASC 820", "ASC 825"]


class IncomeTaxesAgent(BaseAccountingAgent):
    """Income Taxes Specialist (IAS 12 / ASC 740)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-tax-001"
    
    @property
    def name(self) -> str:
        return "Income Taxes Accounting Specialist"
    
    @property
    def category(self) -> str:
        return "income-taxes"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Income Taxes Accounting Specialist",
            "role": "Senior Accounting Advisor - Tax Accounting",
            "system_prompt": """Expert in income tax accounting under IAS 12 and ASC 740.
Specializes in current vs deferred tax, temporary differences, tax base calculations,
deferred tax asset recognition, tax loss carryforwards, and uncertain tax positions.""",
            "capabilities": [
                "current_tax_calculation",
                "deferred_tax_calculation",
                "temporary_differences",
                "tax_loss_carryforwards",
                "uncertain_tax_positions"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_current_tax",
                "description": "Calculate current income tax expense"
            },
            {
                "name": "identify_temporary_differences",
                "description": "Identify taxable and deductible temporary differences"
            },
            {
                "name": "calculate_deferred_tax",
                "description": "Calculate deferred tax assets and liabilities"
            },
            {
                "name": "assess_recoverability",
                "description": "Assess recoverability of deferred tax assets"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 12", "ASC 740", "IFRIC 23"]


class EmployeeBenefitsAgent(BaseAccountingAgent):
    """Employee Benefits & Pensions Specialist (IAS 19)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-emp-001"
    
    @property
    def name(self) -> str:
        return "Employee Benefits & Pensions Specialist"
    
    @property
    def category(self) -> str:
        return "employee-benefits"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Employee Benefits & Pensions Specialist",
            "role": "Senior Accounting Advisor - Employee Benefits",
            "system_prompt": """Expert in employee benefits accounting under IAS 19 and ASC 715.
Specializes in defined benefit vs defined contribution plans,
actuarial gains/losses, remeasurement through OCI, and termination benefits.""",
            "capabilities": [
                "defined_benefit_accounting",
                "defined_contribution_accounting",
                "actuarial_assumptions",
                "remeasurement",
                "termination_benefits"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "calculate_pension_obligation",
                "description": "Calculate defined benefit obligation (DBO)"
            },
            {
                "name": "calculate_service_cost",
                "description": "Calculate current and past service cost"
            },
            {
                "name": "review_actuarial_assumptions",
                "description": "Review reasonableness of actuarial assumptions"
            },
            {
                "name": "calculate_net_interest",
                "description": "Calculate net interest on pension liability/asset"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 19", "ASC 715", "ASC 712"]


class ProvisionsAgent(BaseAccountingAgent):
    """Provisions, Contingent Liabilities & Onerous Contracts Specialist (IAS 37)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-prov-001"
    
    @property
    def name(self) -> str:
        return "Provisions & Contingencies Specialist"
    
    @property
    def category(self) -> str:
        return "provisions"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Provisions & Contingencies Specialist",
            "role": "Senior Accounting Advisor - Provisions",
            "system_prompt": """Expert in provisions and contingencies under IAS 37 and ASC 450.
Specializes in recognition and measurement of provisions,
contingent liabilities and assets, onerous contracts, and restructuring provisions.""",
            "capabilities": [
                "provision_recognition",
                "provision_measurement",
                "contingent_liabilities",
                "onerous_contracts",
                "restructuring_provisions"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "assess_provision_criteria",
                "description": "Assess if provision recognition criteria are met"
            },
            {
                "name": "estimate_provision",
                "description": "Estimate best estimate of provision amount"
            },
            {
                "name": "evaluate_contingency",
                "description": "Evaluate probability and disclosure of contingencies"
            },
            {
                "name": "test_onerous_contract",
                "description": "Test if contract is onerous and calculate provision"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 37", "ASC 450", "IFRIC 21"]


class ImpairmentFairValueAgent(BaseAccountingAgent):
    """Impairment & Fair Value Specialist (IAS 36 / IFRS 13)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-impair-001"
    
    @property
    def name(self) -> str:
        return "Impairment & Fair Value Specialist"
    
    @property
    def category(self) -> str:
        return "impairment"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Impairment & Fair Value Specialist",
            "role": "Senior Accounting Advisor - Impairment",
            "system_prompt": """Expert in impairment and fair value under IAS 36, IFRS 13, and ASC 350/360.
Specializes in cash-generating units, value in use calculations,
fair value less costs of disposal, DCF modeling, and fair value hierarchy.""",
            "capabilities": [
                "impairment_testing",
                "cgu_identification",
                "value_in_use",
                "fair_value_hierarchy",
                "dcf_modeling"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "identify_cgu",
                "description": "Identify cash-generating units"
            },
            {
                "name": "calculate_value_in_use",
                "description": "Calculate value in use using DCF"
            },
            {
                "name": "determine_fvlcod",
                "description": "Determine fair value less costs of disposal"
            },
            {
                "name": "allocate_impairment",
                "description": "Allocate impairment loss to assets"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 36", "IFRS 13", "ASC 350", "ASC 360", "ASC 820"]


class FXHyperinflationAgent(BaseAccountingAgent):
    """FX & Hyperinflation Specialist (IAS 21 / IAS 29)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-fx-001"
    
    @property
    def name(self) -> str:
        return "FX & Hyperinflation Specialist"
    
    @property
    def category(self) -> str:
        return "foreign-exchange"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "FX & Hyperinflation Specialist",
            "role": "Senior Accounting Advisor - Foreign Currency",
            "system_prompt": """Expert in foreign currency and hyperinflation under IAS 21, IAS 29, and ASC 830.
Specializes in functional vs presentation currency determination,
exchange differences on monetary items, translation of foreign operations,
and hyperinflation restatements.""",
            "capabilities": [
                "functional_currency",
                "transaction_translation",
                "foreign_operation_translation",
                "hyperinflation_restatement",
                "net_investment_hedging"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "determine_functional_currency",
                "description": "Determine functional currency based on IAS 21 indicators"
            },
            {
                "name": "translate_transaction",
                "description": "Translate foreign currency transaction"
            },
            {
                "name": "translate_foreign_operation",
                "description": "Translate foreign operation financial statements"
            },
            {
                "name": "apply_hyperinflation",
                "description": "Apply IAS 29 hyperinflation adjustments"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 21", "IAS 29", "ASC 830"]


class ShareBasedPaymentsAgent(BaseAccountingAgent):
    """Share-based Payments Specialist (IFRS 2)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-sbp-001"
    
    @property
    def name(self) -> str:
        return "Share-based Payments Specialist"
    
    @property
    def category(self) -> str:
        return "share-based-payments"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Share-based Payments Specialist",
            "role": "Senior Accounting Advisor - Share-based Payments",
            "system_prompt": """Expert in share-based payment accounting under IFRS 2 and ASC 718.
Specializes in equity-settled vs cash-settled arrangements,
vesting conditions (service, performance, market), option pricing models,
and modifications and cancellations.""",
            "capabilities": [
                "grant_date_fair_value",
                "vesting_conditions",
                "equity_settled",
                "cash_settled",
                "modifications"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "classify_arrangement",
                "description": "Classify as equity or cash-settled"
            },
            {
                "name": "calculate_fair_value",
                "description": "Calculate grant date fair value using option models"
            },
            {
                "name": "expense_over_vesting",
                "description": "Calculate expense over vesting period"
            },
            {
                "name": "account_for_modification",
                "description": "Account for modification of share-based payment"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IFRS 2", "ASC 718"]


class AgricultureAgent(BaseAccountingAgent):
    """Agriculture & Biological Assets Specialist (IAS 41)"""
    
    @property
    def agent_id(self) -> str:
        return "acct-agri-001"
    
    @property
    def name(self) -> str:
        return "Agriculture & Biological Assets Specialist"
    
    @property
    def category(self) -> str:
        return "agriculture"
    
    def get_persona(self) -> Dict[str, Any]:
        return {
            "name": "Agriculture & Biological Assets Specialist",
            "role": "Senior Accounting Advisor - Agriculture",
            "system_prompt": """Expert in agriculture accounting under IAS 41.
Specializes in biological assets (plants, animals), agricultural produce,
fair value models for biological assets, bearer plants (IAS 16 scope),
and agricultural activity recognition.""",
            "capabilities": [
                "biological_asset_recognition",
                "fair_value_measurement",
                "agricultural_produce",
                "bearer_plants",
                "government_grants"
            ]
        }
    
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "identify_biological_asset",
                "description": "Identify and classify biological assets"
            },
            {
                "name": "measure_fair_value",
                "description": "Measure biological asset at fair value less costs to sell"
            },
            {
                "name": "account_for_harvest",
                "description": "Account for harvest of agricultural produce"
            },
            {
                "name": "apply_bearer_plant_rules",
                "description": "Apply IAS 16 rules to bearer plants"
            }
        ]
    
    def get_standards(self) -> List[str]:
        return ["IAS 41", "ASC 905"]
    
    def _suggest_actions(
        self,
        query: str,
        context: Dict[str, Any] = None
    ) -> List[str]:
        return [
            "Identify all biological assets and their classification",
            "Determine if fair value can be measured reliably",
            "Consider bearer plant vs consumable biological asset distinction",
            "Review government grants related to agricultural activity"
        ]

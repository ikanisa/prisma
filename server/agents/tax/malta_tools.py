"""
Malta Tax Tools
Specialized tax calculators and tools for Malta corporate tax.
"""
from typing import Dict, Any, List, Optional
from decimal import Decimal
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

# Malta tax rates and thresholds
MALTA_CORPORATE_TAX_RATE = Decimal("0.35")  # 35%
MALTA_REFUND_RATE_6_7 = Decimal("6") / Decimal("7")  # 6/7 refund for trading income
MALTA_REFUND_RATE_5_7 = Decimal("5") / Decimal("7")  # 5/7 refund for passive interest/royalties
MALTA_REFUND_RATE_2_3 = Decimal("2") / Decimal("3")  # 2/3 refund for passive income with relief
MALTA_PARTICIPATION_EXEMPTION_THRESHOLD = Decimal("0.10")  # 10% holding


@dataclass
class MaltaTaxResult:
    """Result from Malta tax calculation"""
    gross_profit: Decimal
    corporate_tax: Decimal
    net_profit_after_tax: Decimal
    refund_amount: Decimal
    effective_tax_rate: Decimal
    effective_rate_after_refund: Decimal
    notes: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "gross_profit": str(self.gross_profit),
            "corporate_tax": str(self.corporate_tax),
            "net_profit_after_tax": str(self.net_profit_after_tax),
            "refund_amount": str(self.refund_amount),
            "effective_tax_rate": f"{self.effective_tax_rate:.2%}",
            "effective_rate_after_refund": f"{self.effective_rate_after_refund:.2%}",
            "notes": self.notes,
        }


def calculate_malta_corporate_tax(
    profit: Decimal,
    income_type: str = "trading",
    holding_percentage: Optional[Decimal] = None,
    double_tax_relief: bool = False,
) -> MaltaTaxResult:
    """
    Calculate Malta corporate tax with refund system.
    
    Args:
        profit: Taxable profit in EUR
        income_type: Type of income ("trading", "passive", "dividends", "capital_gains")
        holding_percentage: For dividends, percentage of holding in subsidiary
        double_tax_relief: Whether double tax relief applies
        
    Returns:
        MaltaTaxResult with tax calculation details
    """
    profit = Decimal(str(profit))
    notes = []
    
    # Calculate corporate tax at 35%
    corporate_tax = profit * MALTA_CORPORATE_TAX_RATE
    net_profit = profit - corporate_tax
    
    # Check for participation exemption on dividends/capital gains
    if income_type in ("dividends", "capital_gains"):
        if holding_percentage and holding_percentage >= MALTA_PARTICIPATION_EXEMPTION_THRESHOLD:
            # Participation exemption applies - 100% exemption
            notes.append(f"Participation exemption applies (holding: {holding_percentage:.1%})")
            return MaltaTaxResult(
                gross_profit=profit,
                corporate_tax=Decimal("0"),
                net_profit_after_tax=profit,
                refund_amount=Decimal("0"),
                effective_tax_rate=Decimal("0"),
                effective_rate_after_refund=Decimal("0"),
                notes=notes,
            )
    
    # Calculate refund based on income type
    if income_type == "trading":
        # 6/7 refund for trading income - effective rate 5%
        refund_rate = MALTA_REFUND_RATE_6_7
        notes.append("6/7 refund applies for trading income")
    elif income_type == "passive" and double_tax_relief:
        # 2/3 refund for passive income with double tax relief
        refund_rate = MALTA_REFUND_RATE_2_3
        notes.append("2/3 refund applies for passive income with DTR")
    elif income_type == "passive":
        # 5/7 refund for passive interest/royalties
        refund_rate = MALTA_REFUND_RATE_5_7
        notes.append("5/7 refund applies for passive income")
    else:
        # No refund applies
        refund_rate = Decimal("0")
        notes.append("No refund applies for this income type")
    
    refund_amount = corporate_tax * refund_rate
    tax_after_refund = corporate_tax - refund_amount
    
    effective_rate = corporate_tax / profit if profit > 0 else Decimal("0")
    effective_rate_after_refund = tax_after_refund / profit if profit > 0 else Decimal("0")
    
    notes.append(f"Malta corporate tax rate: 35%")
    notes.append(f"Effective rate after refund: {effective_rate_after_refund:.2%}")
    
    return MaltaTaxResult(
        gross_profit=profit,
        corporate_tax=corporate_tax,
        net_profit_after_tax=net_profit,
        refund_amount=refund_amount,
        effective_tax_rate=effective_rate,
        effective_rate_after_refund=effective_rate_after_refund,
        notes=notes,
    )


def check_participation_exemption(
    holding_percentage: Decimal,
    holding_value: Optional[Decimal] = None,
    subsidiary_eu_resident: bool = False,
    subsidiary_subject_to_tax: bool = True,
) -> Dict[str, Any]:
    """
    Check if Malta participation exemption applies.
    
    Requirements (at least one must be met):
    1. Holding of at least 10% equity
    2. Investment of at least €1,164,687
    3. Right to acquire balance of equity
    4. First refusal right
    5. Board seat on subsidiary
    6. Holding for uninterrupted 183 days
    
    Additional requirements:
    - Subsidiary must be subject to foreign tax of at least 15%
    - OR subsidiary is resident in EU
    - OR less than 50% of subsidiary income is passive
    """
    holding_percentage = Decimal(str(holding_percentage))
    result = {
        "qualifies": False,
        "reasons": [],
        "notes": [],
    }
    
    # Check equity threshold
    equity_threshold_met = holding_percentage >= MALTA_PARTICIPATION_EXEMPTION_THRESHOLD
    if equity_threshold_met:
        result["reasons"].append(f"Equity holding of {holding_percentage:.1%} meets 10% threshold")
    
    # Check value threshold (€1,164,687)
    value_threshold_met = False
    if holding_value and holding_value >= Decimal("1164687"):
        value_threshold_met = True
        result["reasons"].append(f"Investment value meets €1,164,687 threshold")
    
    # Check anti-abuse conditions
    if subsidiary_eu_resident:
        result["notes"].append("Subsidiary is EU resident - anti-abuse condition satisfied")
    elif subsidiary_subject_to_tax:
        result["notes"].append("Subsidiary subject to tax at 15%+ - anti-abuse condition satisfied")
    else:
        result["notes"].append("WARNING: Anti-abuse conditions may not be satisfied")
    
    # Determine qualification
    if equity_threshold_met or value_threshold_met:
        result["qualifies"] = True
        result["exemption_rate"] = "100%"
        result["notes"].append("Participation exemption provides 100% exemption on dividends and capital gains")
    
    return result


def calculate_malta_tax_refund(
    tax_paid: Decimal,
    income_type: str = "trading",
    has_double_tax_relief: bool = False,
) -> Dict[str, Any]:
    """
    Calculate Malta tax refund amount for shareholders.
    
    The refund is claimed by shareholders after receiving dividends.
    
    Args:
        tax_paid: Corporate tax paid by the Malta company
        income_type: Type of income that generated the profit
        has_double_tax_relief: Whether DTR was claimed
        
    Returns:
        Refund calculation details
    """
    tax_paid = Decimal(str(tax_paid))
    
    if income_type == "trading":
        refund_fraction = "6/7"
        refund_rate = Decimal("6") / Decimal("7")
        effective_rate = Decimal("0.05")  # ~5%
    elif income_type == "passive" and has_double_tax_relief:
        refund_fraction = "2/3"
        refund_rate = Decimal("2") / Decimal("3")
        effective_rate = Decimal("0.1167")  # ~11.67%
    elif income_type == "passive":
        refund_fraction = "5/7"
        refund_rate = Decimal("5") / Decimal("7")
        effective_rate = Decimal("0.10")  # ~10%
    else:
        refund_fraction = "0"
        refund_rate = Decimal("0")
        effective_rate = Decimal("0.35")
    
    refund_amount = tax_paid * refund_rate
    net_tax = tax_paid - refund_amount
    
    return {
        "tax_paid": str(tax_paid),
        "refund_fraction": refund_fraction,
        "refund_amount": str(refund_amount),
        "net_tax_after_refund": str(net_tax),
        "effective_tax_rate": f"{effective_rate:.2%}",
        "notes": [
            f"Refund of {refund_fraction} of tax paid",
            f"Effective Malta tax rate: {effective_rate:.2%}",
            "Refund claimable by shareholders within 14 days of dividend distribution",
        ],
    }


def get_malta_holding_company_benefits() -> Dict[str, Any]:
    """
    Get overview of Malta holding company benefits.
    """
    return {
        "participation_exemption": {
            "description": "100% exemption on dividends and capital gains from qualifying holdings",
            "requirements": [
                "10% equity holding OR",
                "€1,164,687 minimum investment OR",
                "Right to acquire balance of equity OR",
                "First refusal right OR",
                "Board representation OR",
                "Holding for 183+ days",
            ],
            "anti_abuse": [
                "Subsidiary subject to 15%+ foreign tax OR",
                "Subsidiary is EU resident OR",
                "Less than 50% passive income",
            ],
        },
        "refund_system": {
            "trading_income": {
                "refund": "6/7 of tax",
                "effective_rate": "5%",
            },
            "passive_income": {
                "refund": "5/7 of tax",
                "effective_rate": "10%",
            },
            "passive_with_dtr": {
                "refund": "2/3 of tax",
                "effective_rate": "11.67%",
            },
        },
        "no_withholding_tax": {
            "dividends": "No WHT on dividends to non-residents",
            "interest": "No WHT on interest to non-residents",
            "royalties": "No WHT on royalties to non-residents",
        },
        "tax_treaties": {
            "count": "70+",
            "note": "Extensive treaty network for tax planning",
        },
    }


# Tool definitions for agent integration
MALTA_TOOLS = [
    {
        "name": "calculate_malta_corporate_tax",
        "description": "Calculate Malta corporate tax with refund system. Supports trading income (6/7 refund, ~5% effective) and passive income (5/7 refund, ~10% effective).",
        "parameters": {
            "type": "object",
            "properties": {
                "profit": {"type": "number", "description": "Taxable profit in EUR"},
                "income_type": {
                    "type": "string",
                    "enum": ["trading", "passive", "dividends", "capital_gains"],
                    "description": "Type of income",
                },
                "holding_percentage": {
                    "type": "number",
                    "description": "For dividends, percentage holding in subsidiary (0-1)",
                },
                "double_tax_relief": {
                    "type": "boolean",
                    "description": "Whether double tax relief applies",
                },
            },
            "required": ["profit"],
        },
    },
    {
        "name": "check_participation_exemption",
        "description": "Check if Malta participation exemption applies for dividends and capital gains. Provides 100% exemption on qualifying holdings.",
        "parameters": {
            "type": "object",
            "properties": {
                "holding_percentage": {
                    "type": "number",
                    "description": "Percentage equity holding (0-1)",
                },
                "holding_value": {
                    "type": "number",
                    "description": "Investment value in EUR",
                },
                "subsidiary_eu_resident": {
                    "type": "boolean",
                    "description": "Is subsidiary EU resident",
                },
                "subsidiary_subject_to_tax": {
                    "type": "boolean",
                    "description": "Is subsidiary subject to 15%+ tax",
                },
            },
            "required": ["holding_percentage"],
        },
    },
    {
        "name": "calculate_malta_tax_refund",
        "description": "Calculate shareholder refund on Malta corporate tax. Refund claimed after dividend distribution.",
        "parameters": {
            "type": "object",
            "properties": {
                "tax_paid": {"type": "number", "description": "Corporate tax paid in EUR"},
                "income_type": {
                    "type": "string",
                    "enum": ["trading", "passive"],
                    "description": "Type of income",
                },
                "has_double_tax_relief": {
                    "type": "boolean",
                    "description": "Whether DTR was claimed",
                },
            },
            "required": ["tax_paid"],
        },
    },
]

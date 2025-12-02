"""
Malta Tax Tools
Specific tools for Malta corporate tax calculations and compliance
"""
from typing import Dict, Any, List, Optional
from decimal import Decimal
from fractions import Fraction

def calculate_malta_tax_refund(
    income_amount: float,
    income_type: str,
    foreign_tax_paid: float = 0.0
) -> Dict[str, Any]:
    """
    Calculate Malta tax refund based on income type.

    Args:
        income_amount: Gross income amount
        income_type: Type of income ('trading', 'passive_interest', 'royalties')
        foreign_tax_paid: Amount of foreign tax paid (for double tax relief)

    Returns:
        Dict containing tax calculation and refund details
    """
    # Standard corporate tax rate
    CIT_RATE = Decimal('0.35')

    amount = Decimal(str(income_amount))
    foreign_tax = Decimal(str(foreign_tax_paid))

    # Calculate gross tax
    gross_tax = amount * CIT_RATE

    # Determine refund fraction
    refund_fraction = {
        'trading': Decimal('6') / Decimal('7'),
        'passive_interest': Decimal('5') / Decimal('7'),
        'royalties': Decimal('5') / Decimal('7'),
        'double_tax_relief': Decimal('2') / Decimal('3')
    }.get(income_type, Decimal('6') / Decimal('7'))

    # If foreign tax relief is claimed, refund is limited to 2/3
    if foreign_tax > 0:
        refund_fraction = Decimal('2') / Decimal('3')

    # Calculate refund
    refund_amount = gross_tax * refund_fraction

    # Effective tax
    net_tax = gross_tax - refund_amount
    effective_rate = (net_tax / amount) * 100 if amount > 0 else 0

    # Format fraction string
    frac = Fraction(refund_fraction).limit_denominator()

    return {
        "gross_income": float(amount),
        "gross_tax_charged": float(gross_tax),
        "refund_fraction": f"{frac.numerator}/{frac.denominator}",
        "refund_amount": float(refund_amount),
        "net_tax_payable": float(net_tax),
        "effective_tax_rate_percent": float(effective_rate),
        "currency": "EUR"
    }

def check_participation_exemption(
    holding_percentage: float,
    holding_period_days: int,
    subsidiary_residency: str,
    subsidiary_trading_activity: bool = True,
    subsidiary_tax_rate: float = 0.0
) -> Dict[str, Any]:
    """
    Check eligibility for Malta Participation Exemption.

    Args:
        holding_percentage: Percentage of equity held
        holding_period_days: Number of days held
        subsidiary_residency: Country code of subsidiary
        subsidiary_trading_activity: Whether subsidiary has trading activity
        subsidiary_tax_rate: Tax rate paid by subsidiary

    Returns:
        Eligibility assessment
    """
    # Basic conditions
    equity_condition = holding_percentage >= 5.0  # >5% equity holding (simplified)
    # Alternatively: Voting rights > 10% or value > €1,164,000 held for 183 days

    # Anti-abuse provisions (simplified)
    # 1. Resident or incorporated in EU?
    is_eu = subsidiary_residency in ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"]

    # 2. Subject to foreign tax >= 15%?
    sufficient_tax = subsidiary_tax_rate >= 15.0

    # 3. Not deriving >50% income from passive interest/royalties?
    active_trading = subsidiary_trading_activity

    # One of the three anti-abuse tests must be met
    anti_abuse_pass = is_eu or sufficient_tax or active_trading

    eligible = equity_condition and anti_abuse_pass

    return {
        "eligible": eligible,
        "conditions_met": {
            "equity_holding": equity_condition,
            "anti_abuse_provisions": anti_abuse_pass
        },
        "details": {
            "holding_percentage": holding_percentage,
            "is_eu_subsidiary": is_eu,
            "sufficient_foreign_tax": sufficient_tax,
            "active_trading": active_trading
        },
        "recommendation": "Eligible for Participation Exemption" if eligible else "Not eligible based on provided criteria"
    }

def calculate_corporate_tax(
    profit_before_tax: float,
    adjustments: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Calculate basic Malta corporate tax liability.
    """
    if adjustments is None:
        adjustments = {}

    taxable_income = profit_before_tax

    # Add back disallowable expenses
    disallowable = adjustments.get('disallowable_expenses', 0.0)
    taxable_income += disallowable

    # Deduct capital allowances
    capital_allowances = adjustments.get('capital_allowances', 0.0)
    taxable_income -= capital_allowances

    # Deduct exempt income
    exempt_income = adjustments.get('exempt_income', 0.0)
    taxable_income -= exempt_income

    tax_liability = taxable_income * 0.35

    return {
        "profit_before_tax": profit_before_tax,
        "adjustments": {
            "disallowable_expenses": disallowable,
            "capital_allowances": capital_allowances,
            "exempt_income": exempt_income
        },
        "chargeable_income": taxable_income,
        "tax_rate": "35%",
        "tax_liability": tax_liability
    }

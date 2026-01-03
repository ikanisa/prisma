"""
Rwanda Tax Tools
Specific tools for Rwanda corporate tax calculations and compliance
"""
from typing import Dict, Any, List, Optional
from decimal import Decimal

def calculate_rwanda_cit(
    turnover: float,
    expenses: float,
    industry: str = "general"
) -> Dict[str, Any]:
    """
    Calculate Rwanda Corporate Income Tax (CIT).

    Args:
        turnover: Annual turnover
        expenses: Deductible business expenses
        industry: Industry sector (affects rates/incentives)

    Returns:
        Tax calculation details
    """
    # Standard CIT rate is 30%
    cit_rate = Decimal('0.30')

    # Preferential rates for certain sectors (simplified)
    if industry in ["mining", "export"]:
        cit_rate = Decimal('0.15')  # Example incentive

    profit = Decimal(str(turnover)) - Decimal(str(expenses))
    tax_payable = max(Decimal('0'), profit * cit_rate)

    # Minimum tax check (simplified)
    # If turnover > 400M RWF, minimum tax might apply if losses declared for 5 years

    return {
        "turnover": float(turnover),
        "expenses": float(expenses),
        "taxable_profit": float(profit),
        "tax_rate": float(cit_rate),
        "tax_payable": float(tax_payable),
        "currency": "RWF"
    }

def check_eac_compliance(
    transaction_type: str,
    country_code: str,
    amount: float
) -> Dict[str, Any]:
    """
    Check compliance with East African Community (EAC) tax rules.

    Args:
        transaction_type: 'import', 'export', 'service'
        country_code: Partner state code (KE, TZ, UG, BI, SS, CD)
        amount: Transaction amount

    Returns:
        Compliance check results
    """
    eac_countries = ["KE", "TZ", "UG", "BI", "SS", "CD", "RW"]

    is_eac_partner = country_code in eac_countries

    compliance_notes = []
    withholding_tax_rate = 0.0

    if is_eac_partner:
        compliance_notes.append("Transaction is within EAC Common Market.")
        compliance_notes.append("Zero-rated for VAT if export of goods.")

        if transaction_type == "service":
            # WHT might be lower under DTA
            withholding_tax_rate = 0.15  # Standard
            compliance_notes.append("Check for specific DTA provisions to reduce WHT.")
    else:
        compliance_notes.append("Transaction is outside EAC.")
        if transaction_type == "import":
            compliance_notes.append("Subject to Common External Tariff (CET).")

    return {
        "is_eac_transaction": is_eac_partner,
        "compliance_notes": compliance_notes,
        "estimated_wht_rate": withholding_tax_rate
    }

def assess_thin_cap(
    debt_amount: float,
    equity_amount: float,
    interest_expense: float
) -> Dict[str, Any]:
    """
    Assess Thin Capitalization status (Debt-to-Equity ratio).

    Rwanda generally uses a 4:1 ratio limit for interest deductibility.
    """
    debt = Decimal(str(debt_amount))
    equity = Decimal(str(equity_amount))

    if equity == 0:
        ratio = float('inf')
    else:
        ratio = float(debt / equity)

    limit = 4.0
    is_thin_capitalized = ratio > limit

    allowable_interest = interest_expense
    if is_thin_capitalized:
        # Interest on excess debt is disallowed
        # Simplified calculation: allowable = interest * (4 * equity / debt)
        allowable_interest = interest_expense * (limit / ratio)

    disallowed_interest = interest_expense - allowable_interest

    return {
        "debt_equity_ratio": ratio,
        "limit": limit,
        "is_thin_capitalized": is_thin_capitalized,
        "total_interest": interest_expense,
        "allowable_interest": allowable_interest,
        "disallowed_interest": disallowed_interest,
        "recommendation": "Increase equity or reduce debt to optimize tax position." if is_thin_capitalized else "Capital structure is within tax limits."
    }

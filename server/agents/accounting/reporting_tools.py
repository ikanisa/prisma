"""
Financial Reporting Tools
Tools for generating financial statements and analysis
"""
from typing import Dict, Any, List, Optional

def prepare_financial_statements(
    trial_balance: Dict[str, float],
    period_start: str,
    period_end: str,
    standard: str = "IFRS"
) -> Dict[str, Any]:
    """
    Prepare basic financial statements from trial balance.

    Args:
        trial_balance: Dict of account codes/names to balances
        period_start: Start date
        period_end: End date
        standard: Accounting standard (IFRS, GAAP)

    Returns:
        Financial statements (P&L, Balance Sheet)
    """
    # Simplified mapping logic
    assets = 0.0
    liabilities = 0.0
    equity = 0.0
    revenue = 0.0
    expenses = 0.0

    details = {
        "assets": {},
        "liabilities": {},
        "equity": {},
        "revenue": {},
        "expenses": {}
    }

    for account, balance in trial_balance.items():
        acc_lower = account.lower()

        # Very basic classification based on keywords
        if any(k in acc_lower for k in ["cash", "bank", "receivable", "inventory", "asset"]):
            assets += balance
            details["assets"][account] = balance
        elif any(k in acc_lower for k in ["payable", "loan", "debt", "liability"]):
            liabilities += balance
            details["liabilities"][account] = balance
        elif any(k in acc_lower for k in ["capital", "retained earnings", "equity"]):
            equity += balance
            details["equity"][account] = balance
        elif any(k in acc_lower for k in ["sales", "revenue", "income"]):
            revenue += balance
            details["revenue"][account] = balance
        elif any(k in acc_lower for k in ["expense", "cost", "salary", "rent"]):
            expenses += balance
            details["expenses"][account] = balance

    net_income = revenue - expenses

    # Check accounting equation: Assets = Liabilities + Equity + Net Income
    # (Assuming standard credit/debit sign convention is handled by caller, here we assume all positive magnitudes for simplicity)
    # In a real system, we'd handle DR/CR signs carefully.

    return {
        "period": {
            "start": period_start,
            "end": period_end
        },
        "standard": standard,
        "income_statement": {
            "revenue": revenue,
            "expenses": expenses,
            "net_income": net_income,
            "details": {
                "revenue": details["revenue"],
                "expenses": details["expenses"]
            }
        },
        "balance_sheet": {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity,
            "details": {
                "assets": details["assets"],
                "liabilities": details["liabilities"],
                "equity": details["equity"]
            }
        }
    }

def analyze_financial_ratios(
    financial_data: Dict[str, float]
) -> Dict[str, Any]:
    """
    Calculate key financial ratios.

    Args:
        financial_data: Dict containing key figures (assets, liabilities, revenue, etc.)

    Returns:
        Analysis of financial ratios
    """
    current_assets = financial_data.get("current_assets", 0.0)
    current_liabilities = financial_data.get("current_liabilities", 0.0)
    total_assets = financial_data.get("total_assets", 0.0)
    total_liabilities = financial_data.get("total_liabilities", 0.0)
    total_equity = financial_data.get("total_equity", 0.0)
    revenue = financial_data.get("revenue", 0.0)
    net_income = financial_data.get("net_income", 0.0)

    ratios = {}

    # Liquidity
    if current_liabilities > 0:
        ratios["current_ratio"] = current_assets / current_liabilities

    # Solvency
    if total_equity > 0:
        ratios["debt_to_equity"] = total_liabilities / total_equity

    # Profitability
    if revenue > 0:
        ratios["net_profit_margin"] = (net_income / revenue) * 100

    if total_assets > 0:
        ratios["return_on_assets"] = (net_income / total_assets) * 100

    return {
        "ratios": ratios,
        "analysis": {
            "liquidity_status": "Healthy" if ratios.get("current_ratio", 0) > 1.5 else "Watch",
            "profitability_status": "Positive" if ratios.get("net_profit_margin", 0) > 0 else "Negative"
        }
    }

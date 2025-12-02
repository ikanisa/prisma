"""
Bookkeeping Tools
Tools for day-to-day accounting and reconciliation
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

def classify_transaction(
    description: str,
    amount: float,
    date: str,
    merchant: Optional[str] = None
) -> Dict[str, Any]:
    """
    Classify a transaction into an accounting category.

    Args:
        description: Transaction description
        amount: Transaction amount
        date: Transaction date (ISO format)
        merchant: Merchant name

    Returns:
        Classification details
    """
    # Simple rule-based classification (in production this would use ML)
    desc_lower = description.lower()
    category = "general_expense"
    confidence = 0.5

    if any(k in desc_lower for k in ["uber", "taxi", "flight", "hotel", "airbnb"]):
        category = "travel_and_subsistence"
        confidence = 0.9
    elif any(k in desc_lower for k in ["restaurant", "cafe", "coffee", "lunch", "dinner"]):
        category = "meals_and_entertainment"
        confidence = 0.8
    elif any(k in desc_lower for k in ["aws", "google cloud", "azure", "digital ocean", "hosting"]):
        category = "it_infrastructure"
        confidence = 0.95
    elif any(k in desc_lower for k in ["slack", "zoom", "jira", "github", "software"]):
        category = "software_subscriptions"
        confidence = 0.9
    elif any(k in desc_lower for k in ["salary", "payroll", "wages"]):
        category = "payroll"
        confidence = 0.95

    return {
        "transaction": {
            "description": description,
            "amount": amount,
            "date": date,
            "merchant": merchant
        },
        "classification": {
            "category": category,
            "confidence": confidence,
            "tax_deductible_probability": 1.0 if category != "meals_and_entertainment" else 0.5
        }
    }

def reconcile_account(
    bank_statement_lines: List[Dict[str, Any]],
    ledger_entries: List[Dict[str, Any]],
    tolerance: float = 0.01
) -> Dict[str, Any]:
    """
    Reconcile bank statement lines against ledger entries.

    Args:
        bank_statement_lines: List of bank transactions
        ledger_entries: List of accounting ledger entries
        tolerance: Amount tolerance for matching

    Returns:
        Reconciliation report
    """
    matched = []
    unmatched_bank = []
    unmatched_ledger = list(ledger_entries)  # Copy to track remaining

    for bank_line in bank_statement_lines:
        match_found = False
        bank_amount = bank_line.get("amount", 0)
        bank_date = bank_line.get("date")

        # Try to find match in ledger
        for i, ledger_entry in enumerate(unmatched_ledger):
            ledger_amount = ledger_entry.get("amount", 0)
            ledger_date = ledger_entry.get("date")

            # Check amount match within tolerance
            amount_match = abs(bank_amount - ledger_amount) <= tolerance

            # Check date match (simplified: exact match)
            date_match = bank_date == ledger_date

            if amount_match and date_match:
                matched.append({
                    "bank_line": bank_line,
                    "ledger_entry": ledger_entry,
                    "difference": bank_amount - ledger_amount
                })
                unmatched_ledger.pop(i)
                match_found = True
                break

        if not match_found:
            unmatched_bank.append(bank_line)

    return {
        "status": "balanced" if not unmatched_bank and not unmatched_ledger else "unbalanced",
        "summary": {
            "total_bank_lines": len(bank_statement_lines),
            "total_ledger_entries": len(ledger_entries),
            "matched_count": len(matched),
            "unmatched_bank_count": len(unmatched_bank),
            "unmatched_ledger_count": len(unmatched_ledger)
        },
        "unmatched_items": {
            "bank": unmatched_bank,
            "ledger": unmatched_ledger
        }
    }

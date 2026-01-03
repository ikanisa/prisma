"""
Accounting Agents Integration Test
Tests end-to-end workflows for Accounting agents
"""
import sys
import pytest
import asyncio
from typing import Dict, Any
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')
from server.agents.tool_registry import get_tool_handler

async def run_accounting_workflow(workflow_type: str, data: Dict[str, Any]):
    """Simulates accounting workflow"""
    results = {}

    if workflow_type == "month_end_close":
        # Step 1: Classify Transactions
        class_handler = get_tool_handler("classify_transaction")
        classified = []
        for txn in data["transactions"]:
            res = class_handler(description=txn["desc"], amount=txn["amount"], date="2025-01-31")
            classified.append(res)
        results["classification"] = classified

        # Step 2: Reconcile Account
        rec_handler = get_tool_handler("reconcile_account")
        rec_res = rec_handler(
            bank_statement_lines=[{"amount": 1000, "date": "2025-01-31"}],
            ledger_entries=[{"amount": 1000, "date": "2025-01-31"}]
        )
        results["reconciliation"] = rec_res

        # Step 3: Prepare Financials
        rep_handler = get_tool_handler("prepare_financial_statements")
        rep_res = rep_handler(
            trial_balance=data["trial_balance"],
            period_start="2025-01-01",
            period_end="2025-01-31"
        )
        results["financials"] = rep_res

    return results

@pytest.mark.asyncio
async def test_accounting_close_workflow():
    """Test Month-End Close Workflow"""
    print("\n[1/1] Testing Accounting Close Workflow...")

    data = {
        "transactions": [
            {"desc": "Office rent", "amount": 1000},
            {"desc": "Client payment", "amount": 5000}
        ],
        "book_balance": 10000,
        "bank_balance": 12000,
        "outstanding": 3000, # Checks not yet cleared
        "deposits": 1000,    # Deposits not yet in bank
        "trial_balance": {
            "Revenue": 50000,
            "Expenses": 30000,
            "Assets": 100000,
            "Liabilities": 40000,
            "Equity": 40000 # Retained earnings + current year profit (20k)
        }
    }

    result = await run_accounting_workflow("month_end_close", data)

    assert len(result["classification"]) == 2
    assert result["reconciliation"]["status"] == "balanced"
    assert result["financials"]["income_statement"]["net_income"] == 20000

    print("  ✓ Classification -> Reconciliation -> Reporting workflow successful")

if __name__ == "__main__":
    asyncio.run(test_accounting_close_workflow())

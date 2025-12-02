"""
Phase 2.3 Accounting Tool Integration Test
Tests Bookkeeping and Financial Reporting tools
"""
import sys
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

from server.agents.tool_registry import get_tool_handler

def test_bookkeeping_tools():
    """Test Bookkeeping tools"""
    print("\n[1/2] Testing Bookkeeping Tools...")

    # Test 1: Classify Transaction
    handler = get_tool_handler("classify_transaction")
    assert handler is not None, "classify_transaction handler not found"

    res_uber = handler(description="Uber trip to airport", amount=45.50, date="2025-12-01")
    assert res_uber["classification"]["category"] == "travel_and_subsistence"
    print(f"  - Classified 'Uber trip': {res_uber['classification']['category']}")

    res_aws = handler(description="AWS EMEA Invoice", amount=1200.00, date="2025-12-01")
    assert res_aws["classification"]["category"] == "it_infrastructure"
    print(f"  - Classified 'AWS Invoice': {res_aws['classification']['category']}")
    print("  ✓ classify_transaction working")

    # Test 2: Reconcile Account
    handler = get_tool_handler("reconcile_account")
    assert handler is not None, "reconcile_account handler not found"

    bank_lines = [
        {"date": "2025-12-01", "amount": 100.00, "desc": "Deposit"},
        {"date": "2025-12-02", "amount": -50.00, "desc": "Payment"}
    ]
    ledger_entries = [
        {"date": "2025-12-01", "amount": 100.00, "ref": "DEP001"},
        {"date": "2025-12-02", "amount": -50.00, "ref": "PAY001"}
    ]

    res_recon = handler(bank_statement_lines=bank_lines, ledger_entries=ledger_entries)
    assert res_recon["status"] == "balanced"
    assert res_recon["summary"]["matched_count"] == 2
    print("  ✓ reconcile_account (balanced) working")


def test_reporting_tools():
    """Test Financial Reporting tools"""
    print("\n[2/2] Testing Reporting Tools...")

    # Test 1: Prepare Financial Statements
    handler = get_tool_handler("prepare_financial_statements")
    assert handler is not None, "prepare_financial_statements handler not found"

    trial_balance = {
        "Cash at Bank": 50000.0,
        "Accounts Receivable": 20000.0,
        "Accounts Payable": 15000.0,
        "Sales Revenue": 100000.0,
        "Rent Expense": 12000.0,
        "Salary Expense": 30000.0,
        "Share Capital": 10000.0,
        "Retained Earnings": 7000.0  # Balancing figure
    }

    res_fs = handler(trial_balance=trial_balance, period_start="2025-01-01", period_end="2025-12-31")

    # Net Income = 100k - (12k + 30k) = 58k
    assert res_fs["income_statement"]["net_income"] == 58000.0
    assert res_fs["balance_sheet"]["assets"] == 70000.0  # 50k + 20k
    print(f"  - Net Income calculated: {res_fs['income_statement']['net_income']}")
    print("  ✓ prepare_financial_statements working")

    # Test 2: Analyze Ratios
    handler = get_tool_handler("analyze_financial_ratios")
    assert handler is not None, "analyze_financial_ratios handler not found"

    data = {
        "current_assets": 70000.0,
        "current_liabilities": 15000.0,
        "revenue": 100000.0,
        "net_income": 58000.0
    }

    res_ratios = handler(financial_data=data)
    assert res_ratios["ratios"]["current_ratio"] > 4.0  # 70/15 = 4.66
    # Use approx comparison for floats
    assert abs(res_ratios["ratios"]["net_profit_margin"] - 58.0) < 0.01
    print(f"  - Current Ratio: {res_ratios['ratios']['current_ratio']:.2f}")
    print("  ✓ analyze_financial_ratios working")


if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 2.3 ACCOUNTING INTEGRATION TEST")
    print("=" * 70)

    test_bookkeeping_tools()
    test_reporting_tools()

    print("\n" + "=" * 70)
    print("ALL ACCOUNTING TESTS PASSED ✓")
    print("=" * 70)

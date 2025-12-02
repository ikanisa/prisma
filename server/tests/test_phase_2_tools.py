"""
Phase 2 Tool Integration Test
Tests Malta and Rwanda tax tools
"""
import asyncio
import sys
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

from server.agents.tool_registry import get_tool_handler

def test_malta_tools():
    """Test Malta tax tools"""
    print("\n[1/2] Testing Malta Tools...")

    # Test 1: Tax Refund
    handler = get_tool_handler("calculate_malta_tax_refund")
    assert handler is not None, "calculate_malta_tax_refund handler not found"

    result = handler(income_amount=100000, income_type="trading")
    print(f"  - Refund calculation: {result['refund_amount']} (Expected ~30000)")
    assert result["gross_tax_charged"] == 35000.0
    assert result["refund_amount"] == 30000.0  # 6/7 of 35,000
    assert result["effective_tax_rate_percent"] == 5.0
    print("  ✓ calculate_malta_tax_refund working")

    # Test 2: Participation Exemption
    handler = get_tool_handler("check_participation_exemption")
    assert handler is not None, "check_participation_exemption handler not found"

    # Eligible case
    res_eligible = handler(
        holding_percentage=10.0,
        holding_period_days=365,
        subsidiary_residency="DE",  # EU
        subsidiary_trading_activity=True
    )
    assert res_eligible["eligible"] == True
    print("  ✓ check_participation_exemption (eligible) working")

    # Ineligible case
    res_ineligible = handler(
        holding_percentage=2.0,  # < 5%
        holding_period_days=365,
        subsidiary_residency="DE"
    )
    assert res_ineligible["eligible"] == False
    print("  ✓ check_participation_exemption (ineligible) working")


def test_rwanda_tools():
    """Test Rwanda tax tools"""
    print("\n[2/2] Testing Rwanda Tools...")

    # Test 1: CIT Calculation
    handler = get_tool_handler("calculate_rwanda_cit")
    assert handler is not None, "calculate_rwanda_cit handler not found"

    result = handler(turnover=1000000, expenses=600000)
    # Profit 400,000 * 30% = 120,000
    assert result["tax_payable"] == 120000.0
    print(f"  - CIT calculation: {result['tax_payable']} (Expected 120000)")
    print("  ✓ calculate_rwanda_cit working")

    # Test 2: EAC Compliance
    handler = get_tool_handler("check_eac_compliance")
    assert handler is not None, "check_eac_compliance handler not found"

    res_eac = handler(transaction_type="export", country_code="KE", amount=5000)
    assert res_eac["is_eac_transaction"] == True
    print("  ✓ check_eac_compliance working")

    # Test 3: Thin Capitalization
    handler = get_tool_handler("assess_thin_cap")
    assert handler is not None, "assess_thin_cap handler not found"

    # Thinly capitalized (Debt 500, Equity 100 -> 5:1 > 4:1)
    res_thin = handler(debt_amount=500000, equity_amount=100000, interest_expense=50000)
    assert res_thin["is_thin_capitalized"] == True
    assert res_thin["disallowed_interest"] > 0
    print("  ✓ assess_thin_cap working")


if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 2 TOOL INTEGRATION TEST")
    print("=" * 70)

    test_malta_tools()
    test_rwanda_tools()

    print("\n" + "=" * 70)
    print("ALL PHASE 2 TESTS PASSED ✓")
    print("=" * 70)

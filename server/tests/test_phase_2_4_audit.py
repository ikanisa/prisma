"""
Phase 2.4 Audit Tool Integration Test
Tests Audit Planning and Risk Assessment tools
"""
import sys
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

from server.agents.tool_registry import get_tool_handler

def test_audit_planning():
    """Test Audit Planning tools"""
    print("\n[1/2] Testing Audit Planning Tools...")

    # Test 1: Materiality
    handler = get_tool_handler("calculate_materiality")
    assert handler is not None, "calculate_materiality handler not found"

    res_mat = handler(
        revenue=10000000.0,
        profit_before_tax=500000.0,
        total_assets=5000000.0,
        entity_type="commercial"
    )
    # 5% of 500k = 25k
    assert res_mat["planning_materiality"] == 25000.0
    assert res_mat["selected_benchmark"] == "profit"
    print(f"  - Planning Materiality: {res_mat['planning_materiality']}")
    print("  ✓ calculate_materiality working")

    # Test 2: Strategy
    handler = get_tool_handler("develop_audit_strategy")
    assert handler is not None, "develop_audit_strategy handler not found"

    res_strat = handler(
        entity_size="large",
        risk_level="high",
        industry="financial_services"
    )
    assert "IT Audit Specialist" in res_strat["resource_allocation"]["team_composition"]
    assert "Loan Loss Provisions" in res_strat["key_focus_areas"]
    print("  ✓ develop_audit_strategy working")


def test_audit_risk():
    """Test Audit Risk tools"""
    print("\n[2/2] Testing Audit Risk Tools...")

    # Test 1: Inherent Risk
    handler = get_tool_handler("assess_inherent_risk")
    assert handler is not None, "assess_inherent_risk handler not found"

    res_risk = handler(
        account_balance="Derivatives",
        complexity="high",
        subjectivity="high",
        change_factor="reg_change"
    )
    assert res_risk["is_significant_risk"] == True
    print(f"  - Risk Level: {res_risk['inherent_risk_level']}")
    print("  ✓ assess_inherent_risk working")

    # Test 2: Fraud Indicators
    handler = get_tool_handler("analyze_fraud_indicators")
    assert handler is not None, "analyze_fraud_indicators handler not found"

    entries = [
        {"id": 1, "description": "Revenue adjustment", "amount": 50000, "time": "Sunday 23:00"},
        {"id": 2, "description": "Regular sales", "amount": 1234, "time": "Monday 10:00"}
    ]

    res_fraud = handler(journal_entries=entries)
    # Entry 1 triggers 3 flags: Round number, Weekend, Revenue adjustment
    assert res_fraud["flagged_entries_count"] == 3
    indicators = [f["indicator"] for f in res_fraud["indicators_found"]]
    assert "Weekend posting" in indicators
    assert "Large round number" in indicators
    print("  ✓ analyze_fraud_indicators working")


if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 2.4 AUDIT INTEGRATION TEST")
    print("=" * 70)

    test_audit_planning()
    test_audit_risk()

    print("\n" + "=" * 70)
    print("ALL AUDIT TESTS PASSED ✓")
    print("=" * 70)

"""
Phase 2.5 Corporate Services Tool Integration Test
Tests Formation and Governance tools
"""
import sys
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

from server.agents.tool_registry import get_tool_handler

def test_formation_tools():
    """Test Formation tools"""
    print("\n[1/2] Testing Formation Tools...")

    # Test 1: Recommend Entity
    handler = get_tool_handler("recommend_entity_type")
    assert handler is not None, "recommend_entity_type handler not found"

    res_mt = handler(
        jurisdiction="MT",
        shareholders=2,
        capital=1200,
        liability_protection=True
    )
    assert "Private Limited Liability Company" in res_mt["recommended_entity"]
    print(f"  - Recommended Entity (MT): {res_mt['recommended_entity']}")
    print("  ✓ recommend_entity_type working")

    # Test 2: Prepare Docs
    handler = get_tool_handler("prepare_formation_docs")
    assert handler is not None, "prepare_formation_docs handler not found"

    res_docs = handler(
        entity_type="Ltd",
        company_name="Test Corp Ltd",
        directors=["John Doe"],
        shareholders=["Jane Doe"]
    )
    assert len(res_docs["document_package"]) >= 4
    assert res_docs["document_package"][0]["name"] == "Memorandum of Association"
    print("  ✓ prepare_formation_docs working")


def test_governance_tools():
    """Test Governance tools"""
    print("\n[2/2] Testing Governance Tools...")

    # Test 1: Compliance Deadlines
    handler = get_tool_handler("track_compliance_deadlines")
    assert handler is not None, "track_compliance_deadlines handler not found"

    res_deadlines = handler(
        jurisdiction="MT",
        entity_type="Ltd",
        incorporation_date="2024-01-01"
    )
    assert len(res_deadlines["upcoming_deadlines"]) >= 2
    print(f"  - Found {len(res_deadlines['upcoming_deadlines'])} deadlines for MT")
    print("  ✓ track_compliance_deadlines working")

    # Test 2: Board Minutes
    handler = get_tool_handler("prepare_board_minutes")
    assert handler is not None, "prepare_board_minutes handler not found"

    res_minutes = handler(
        meeting_date="2025-12-01",
        attendees=["Director A", "Director B"],
        agenda_items=["Approve Accounts", "Declare Dividend"],
        resolutions=["Accounts approved", "Dividend declared"]
    )
    assert "IT WAS RESOLVED THAT" in res_minutes["draft_minutes_text"]
    print("  ✓ prepare_board_minutes working")


if __name__ == "__main__":
    print("=" * 70)
    print("PHASE 2.5 CORPORATE SERVICES INTEGRATION TEST")
    print("=" * 70)

    test_formation_tools()
    test_governance_tools()

    print("\n" + "=" * 70)
    print("ALL CORPORATE TESTS PASSED ✓")
    print("=" * 70)

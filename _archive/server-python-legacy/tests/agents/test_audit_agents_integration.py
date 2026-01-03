"""
Audit Agents Integration Test
Tests end-to-end workflows for Audit agents
"""
import sys
import pytest
import asyncio
from typing import Dict, Any
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')
from server.agents.tool_registry import get_tool_handler

async def run_audit_workflow(workflow_type: str, data: Dict[str, Any]):
    """Simulates audit workflow"""
    results = {}

    if workflow_type == "planning_risk":
        # Step 1: Calculate Materiality
        mat_handler = get_tool_handler("calculate_materiality")
        mat_res = mat_handler(
            revenue=data["revenue"],
            profit_before_tax=data["profit"],
            total_assets=data["assets"]
        )
        results["materiality"] = mat_res

        # Step 2: Assess Inherent Risk
        risk_handler = get_tool_handler("assess_inherent_risk")
        risk_res = risk_handler(
            account_balance="Revenue",
            complexity="High",
            subjectivity="medium",
            change_factor="system_change" if data["changes"] else "none"
        )
        results["risk"] = risk_res

        # Step 3: Develop Strategy
        strat_handler = get_tool_handler("develop_audit_strategy")
        strat_res = strat_handler(
            entity_size="medium",
            risk_level=risk_res["inherent_risk_level"].lower(),
            industry=data["industry"].lower()
        )
        results["strategy"] = strat_res

    return results

@pytest.mark.asyncio
async def test_audit_planning_workflow():
    """Test Audit Planning & Risk Workflow"""
    print("\n[1/1] Testing Audit Planning Workflow...")

    data = {
        "revenue": 5000000,
        "assets": 2000000,
        "profit": 500000,
        "industry": "Technology",
        "complexity": "High",
        "changes": True
    }

    result = await run_audit_workflow("planning_risk", data)

    assert "materiality" in result
    assert "risk" in result
    assert "strategy" in result

    # Verify data flow
    mat_val = result["materiality"]["planning_materiality"]
    risk_val = result["risk"]["inherent_risk_level"]

    assert mat_val > 0
    assert risk_val in ["Significant Risk", "High", "Medium", "Low"]

    print(f"  - Materiality: {mat_val}")
    print(f"  - Risk Level: {risk_val}")
    print("  ✓ Audit Planning -> Risk -> Strategy workflow successful")

if __name__ == "__main__":
    asyncio.run(test_audit_planning_workflow())

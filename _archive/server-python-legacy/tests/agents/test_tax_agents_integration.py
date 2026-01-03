"""
Tax Agents Integration Test
Tests end-to-end workflows for Malta and Rwanda tax agents
"""
import sys
import pytest
import asyncio
from typing import Dict, Any

sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

# Mock the agent execution environment
# In a real scenario, this would call the actual agent API or handler
from server.agents.tool_registry import get_tool_handler

class MockAgentContext:
    def __init__(self, jurisdiction: str):
        self.jurisdiction = jurisdiction

async def run_tax_workflow(jurisdiction: str, workflow_type: str, data: Dict[str, Any]):
    """
    Simulates an agent workflow by calling the appropriate tools in sequence.
    This verifies that tools can be chained together to solve a problem.
    """
    results = {}

    if jurisdiction == "MT":
        if workflow_type == "refund_analysis":
            # Step 1: Calculate Corporate Tax
            cit_handler = get_tool_handler("calculate_corporate_tax")
            cit_res = cit_handler(
                profit_before_tax=data["profit"],
                adjustments=data.get("adjustments", {})
            )
            results["cit"] = cit_res

            # Step 2: Calculate Refund
            refund_handler = get_tool_handler("calculate_malta_tax_refund")
            refund_res = refund_handler(
                income_amount=data["dividend"],
                income_type="trading",
                foreign_tax_paid=0.0
            )
            results["refund"] = refund_res

    elif jurisdiction == "RW":
        if workflow_type == "compliance_check":
            # Step 1: Check EAC Compliance
            eac_handler = get_tool_handler("check_eac_compliance")
            eac_res = eac_handler(
                transaction_type="import",
                country_code="KE", # Kenya is EAC
                amount=1000000
            )
            results["eac"] = eac_res

            # Step 2: Calculate CIT
            cit_handler = get_tool_handler("calculate_rwanda_cit")
            cit_res = cit_handler(
                turnover=data["income"],
                expenses=data.get("expenses", 0),
                industry="general"
            )
            results["cit"] = cit_res

    return results

@pytest.mark.asyncio
async def test_malta_tax_workflow():
    """Test Malta Tax Refund Workflow"""
    print("\n[1/2] Testing Malta Tax Workflow...")

    data = {
        "profit": 100000,
        "dividend": 65000,
        "account_type": "MTA"
    }

    result = await run_tax_workflow("MT", "refund_analysis", data)

    assert "cit" in result
    assert "refund" in result
    assert result["cit"]["tax_liability"] == 35000.0
    # 6/7ths of tax paid on distributed profits
    # Tax on 100k is 35k. Distributed 65k (net) -> 100k gross.
    # Refund should be 6/7 of 35k = 30k
    assert result["refund"]["refund_fraction"] == "6/7"

    print("  ✓ Malta CIT -> Refund workflow successful")

@pytest.mark.asyncio
async def test_rwanda_tax_workflow():
    """Test Rwanda Compliance Workflow"""
    print("\n[2/2] Testing Rwanda Tax Workflow...")

    data = {
        "goods": "Coffee Beans",
        "origin": "Kenya",
        "income": 50000000, # 50M RWF
        "company_type": "general"
    }

    result = await run_tax_workflow("RW", "compliance_check", data)

    assert "eac" in result
    assert "cit" in result
    assert result["eac"]["is_eac_transaction"] == True
    assert result["cit"]["tax_rate"] == 0.3

    print("  ✓ Rwanda EAC -> CIT workflow successful")

if __name__ == "__main__":
    asyncio.run(test_malta_tax_workflow())
    asyncio.run(test_rwanda_tax_workflow())

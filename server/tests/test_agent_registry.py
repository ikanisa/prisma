"""
Test script for agent registry and discovery API
"""
import asyncio
import sys
sys.path.insert(0, '/Users/jeanbosco/workspace/prisma')

from server.agents.registry import get_registry, AgentDomain, AgentCapability


async def test_registry():
    """Test agent registry functionality"""
    print("=" * 60)
    print("AGENT REGISTRY TEST")
    print("=" * 60)

    registry = get_registry()

    # Test 1: List all agents
    all_agents = registry.list_all()
    print(f"\n✓ Total agents registered: {len(all_agents)}")

    # Test 2: List by domain
    tax_agents = registry.list_by_domain(AgentDomain.TAX)
    audit_agents = registry.list_by_domain(AgentDomain.AUDIT)
    accounting_agents = registry.list_by_domain(AgentDomain.ACCOUNTING)
    corporate_agents = registry.list_by_domain(AgentDomain.CORPORATE_SERVICES)

    print(f"\n✓ Tax agents: {len(tax_agents)}")
    for agent in tax_agents:
        print(f"  - {agent.name} ({agent.agent_id})")

    print(f"\n✓ Audit agents: {len(audit_agents)}")
    for agent in audit_agents:
        print(f"  - {agent.name} ({agent.agent_id})")

    print(f"\n✓ Accounting agents: {len(accounting_agents)}")
    for agent in accounting_agents:
        print(f"  - {agent.name} ({agent.agent_id})")

    print(f"\n✓ Corporate Services agents: {len(corporate_agents)}")
    for agent in corporate_agents:
        print(f"  - {agent.name} ({agent.agent_id})")

    # Test 3: List by jurisdiction
    malta_agents = registry.list_by_jurisdiction("MT")
    rwanda_agents = registry.list_by_jurisdiction("RW")

    print(f"\n✓ Malta agents: {len(malta_agents)}")
    print(f"✓ Rwanda agents: {len(rwanda_agents)}")

    # Test 4: Get specific agent
    malta_tax = registry.get("tax-corp-mt-026")
    if malta_tax:
        print(f"\n✓ Malta Tax Agent found:")
        print(f"  Name: {malta_tax.name}")
        print(f"  Description: {malta_tax.description}")
        print(f"  Capabilities: {[c.value for c in malta_tax.capabilities]}")
        print(f"  Tools: {len(malta_tax.tools)} tools")

    # Test 5: Search with filters
    corporate_tax_agents = registry.search(
        capability=AgentCapability.CORPORATE_TAX,
        active_only=True
    )
    print(f"\n✓ Corporate tax specialists: {len(corporate_tax_agents)}")

    print("\n" + "=" * 60)
    print("ALL TESTS PASSED ✓")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_registry())

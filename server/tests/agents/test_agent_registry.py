"""
Agent Registry Tests
Tests for central agent registry and discovery functionality.
"""
import pytest
from server.agents.registry import (
    AgentRegistry,
    AgentDomain,
    AgentMetadata,
    get_agent_registry,
    list_all_agents,
    discover_agents,
)


class TestAgentRegistry:
    """Test suite for Agent Registry"""
    
    def test_registry_singleton(self):
        """Test that registry is a singleton"""
        registry1 = get_agent_registry()
        registry2 = get_agent_registry()
        assert registry1 is registry2
    
    def test_list_all_agents(self):
        """Test listing all agents"""
        agents = list_all_agents()
        assert len(agents) > 0
        assert all('agent_id' in agent for agent in agents)
        assert all('name' in agent for agent in agents)
        assert all('domain' in agent for agent in agents)
    
    def test_list_by_domain_tax(self):
        """Test filtering agents by tax domain"""
        agents = list_all_agents(domain=AgentDomain.TAX)
        assert len(agents) >= 12  # We have at least 12 tax agents
        assert all(agent['domain'] == 'tax' for agent in agents)
    
    def test_list_by_domain_accounting(self):
        """Test filtering agents by accounting domain"""
        agents = list_all_agents(domain=AgentDomain.ACCOUNTING)
        assert len(agents) >= 8  # We have at least 8 accounting agents
        assert all(agent['domain'] == 'accounting' for agent in agents)
    
    def test_list_by_domain_audit(self):
        """Test filtering agents by audit domain"""
        agents = list_all_agents(domain=AgentDomain.AUDIT)
        assert len(agents) >= 10  # We have 10 audit agents
        assert all(agent['domain'] == 'audit' for agent in agents)
    
    def test_list_by_domain_corporate(self):
        """Test filtering agents by corporate domain"""
        agents = list_all_agents(domain=AgentDomain.CORPORATE)
        assert len(agents) >= 4  # We have at least 4 corporate agents
        assert all(agent['domain'] == 'corporate' for agent in agents)
    
    def test_list_by_jurisdiction(self):
        """Test filtering agents by jurisdiction"""
        agents = list_all_agents(jurisdiction="MT")
        assert len(agents) >= 1
        # Should include Malta tax agent
        malta_agents = [a for a in agents if 'MT' in a.get('jurisdictions', [])]
        assert len(malta_agents) >= 1
    
    def test_list_by_jurisdiction_global(self):
        """Test filtering agents by GLOBAL jurisdiction"""
        agents = list_all_agents(jurisdiction="GLOBAL")
        # Transfer pricing, international tax, etc.
        assert len(agents) >= 3
    
    def test_list_by_capability(self):
        """Test filtering agents by capability"""
        agents = list_all_agents(capability="transfer_pricing")
        assert len(agents) >= 1
        # Should include transfer pricing specialist
        tp_agents = [a for a in agents if 'transfer_pricing' in a.get('capabilities', [])]
        assert len(tp_agents) >= 1
    
    def test_get_agent_by_id(self):
        """Test getting a specific agent by ID"""
        registry = get_agent_registry()
        agent = registry.get_agent("tax-corp-mt-003")
        assert agent is not None
        assert agent.agent_id == "tax-corp-mt-003"
        assert agent.name == "Malta Corporate Tax Specialist"
        assert agent.domain == AgentDomain.TAX
    
    def test_get_agent_not_found(self):
        """Test getting non-existent agent"""
        registry = get_agent_registry()
        agent = registry.get_agent("non-existent-agent")
        assert agent is None
    
    def test_discover_agents_by_query(self):
        """Test agent discovery by query"""
        agents = discover_agents("transfer pricing")
        assert len(agents) >= 1
        # Transfer pricing specialist should be first
        assert "transfer" in agents[0]['name'].lower() or "transfer" in agents[0]['description'].lower()
    
    def test_discover_agents_malta(self):
        """Test discovering Malta-related agents"""
        agents = discover_agents("Malta tax")
        assert len(agents) >= 1
        # Malta agent should be in results
        malta_found = any('malta' in a['name'].lower() for a in agents)
        assert malta_found
    
    def test_discover_agents_rwanda(self):
        """Test discovering Rwanda-related agents"""
        agents = discover_agents("Rwanda EAC")
        assert len(agents) >= 1
        # Rwanda agent should be in results
        rwanda_found = any('rwanda' in a['name'].lower() for a in agents)
        assert rwanda_found
    
    def test_discover_agents_with_jurisdiction_filter(self):
        """Test discovery with jurisdiction filter"""
        agents = discover_agents("corporate tax", jurisdiction="UK")
        assert len(agents) >= 1
        # Should prioritize UK agents
        uk_agents = [a for a in agents if 'UK' in a.get('jurisdictions', [])]
        assert len(uk_agents) >= 1
    
    def test_discover_agents_with_domain_filter(self):
        """Test discovery with domain filter"""
        agents = discover_agents("revenue recognition", domain=AgentDomain.ACCOUNTING)
        assert len(agents) >= 1
        assert all(a['domain'] == 'accounting' for a in agents)
    
    def test_count_agents(self):
        """Test counting agents"""
        registry = get_agent_registry()
        total = registry.count_agents()
        assert total > 30  # We have at least 34 agents total
        
        tax_count = registry.count_agents(AgentDomain.TAX)
        accounting_count = registry.count_agents(AgentDomain.ACCOUNTING)
        audit_count = registry.count_agents(AgentDomain.AUDIT)
        corporate_count = registry.count_agents(AgentDomain.CORPORATE)
        
        assert tax_count >= 12
        assert accounting_count >= 8
        assert audit_count >= 10
        assert corporate_count >= 4
        
        # Sum should equal total
        assert tax_count + accounting_count + audit_count + corporate_count == total
    
    def test_agent_metadata_to_dict(self):
        """Test AgentMetadata to_dict conversion"""
        registry = get_agent_registry()
        agent = registry.get_agent("acct-revenue-001")
        assert agent is not None
        
        data = agent.to_dict()
        assert data['agent_id'] == "acct-revenue-001"
        assert data['name'] == "Revenue Recognition Specialist"
        assert data['domain'] == "accounting"
        assert 'IFRS 15' in data['standards']
        assert 'revenue_recognition' in data['capabilities']


class TestAgentDomains:
    """Test domain-specific agent registration"""
    
    def test_all_tax_agents_have_jurisdictions(self):
        """Test all tax agents have jurisdictions defined"""
        registry = get_agent_registry()
        tax_agents = registry.list_agents(domain=AgentDomain.TAX)
        
        for agent in tax_agents:
            assert len(agent['jurisdictions']) > 0, f"{agent['agent_id']} has no jurisdictions"
    
    def test_all_accounting_agents_have_standards(self):
        """Test all accounting agents have standards defined"""
        registry = get_agent_registry()
        accounting_agents = registry.list_agents(domain=AgentDomain.ACCOUNTING)
        
        for agent in accounting_agents:
            assert len(agent['standards']) > 0, f"{agent['agent_id']} has no standards"
    
    def test_all_audit_agents_have_isa_standards(self):
        """Test all audit agents reference ISA standards"""
        registry = get_agent_registry()
        audit_agents = registry.list_agents(domain=AgentDomain.AUDIT)
        
        for agent in audit_agents:
            has_isa = any('ISA' in s or 'ISQM' in s for s in agent['standards'])
            assert has_isa, f"{agent['agent_id']} has no ISA/ISQM standards"
    
    def test_all_agents_have_capabilities(self):
        """Test all agents have capabilities defined"""
        registry = get_agent_registry()
        all_agents = registry.list_agents()
        
        for agent in all_agents:
            assert len(agent['capabilities']) > 0, f"{agent['agent_id']} has no capabilities"

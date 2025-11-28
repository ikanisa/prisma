"""
Agent System Tests
Comprehensive testing for tax and accounting agents.
"""
import pytest
from server.agents.tax import get_tax_agent, list_tax_agents
from server.agents.accounting import get_accounting_agent, list_accounting_agents
from server.orchestration.agent_orchestrator import AgentOrchestrator


class TestTaxAgents:
    """Test suite for tax agents"""
    
    def test_list_tax_agents(self):
        """Test listing all tax agents"""
        agents = list_tax_agents()
        assert len(agents) == 12
        assert all('agent_id' in agent for agent in agents)
        assert all('name' in agent for agent in agents)
    
    def test_eu_tax_agent_creation(self):
        """Test EU corporate tax agent creation"""
        agent = get_tax_agent("tax-corp-eu-027", "test-org")
        assert agent.agent_id == "tax-corp-eu-027"
        assert agent.name == "EU Corporate Tax Specialist"
        assert "EU-27" in str(agent.get_jurisdictions())
    
    def test_us_tax_agent_creation(self):
        """Test US corporate tax agent creation"""
        agent = get_tax_agent("tax-corp-us-050", "test-org")
        assert agent.agent_id == "tax-corp-us-050"
        assert "US" in agent.get_jurisdictions()
    
    def test_agent_metadata(self):
        """Test agent metadata"""
        agent = get_tax_agent("tax-corp-uk-025", "test-org")
        metadata = agent.get_metadata()
        assert 'agent_id' in metadata
        assert 'name' in metadata
        assert 'category' in metadata
        assert 'jurisdictions' in metadata
    
    def test_agent_tools(self):
        """Test agent tools"""
        agent = get_tax_agent("tax-corp-eu-027", "test-org")
        tools = agent.get_tools()
        assert len(tools) > 0
        assert all('name' in tool for tool in tools)
        assert all('description' in tool for tool in tools)
    
    @pytest.mark.asyncio
    async def test_agent_query_processing(self):
        """Test agent query processing"""
        agent = get_tax_agent("tax-corp-us-050", "test-org")
        response = await agent.process_query(
            "What is the corporate tax rate in the US?",
            {"jurisdiction": "US"}
        )
        assert 'agent_id' in response
        assert 'guidance' in response
        assert 'confidence' in response


class TestAccountingAgents:
    """Test suite for accounting agents"""
    
    def test_list_accounting_agents(self):
        """Test listing all accounting agents"""
        agents = list_accounting_agents()
        assert len(agents) == 8
        assert all('agent_id' in agent for agent in agents)
    
    def test_revenue_agent_creation(self):
        """Test revenue recognition agent"""
        agent = get_accounting_agent("acct-revenue-001", "test-org")
        assert agent.agent_id == "acct-revenue-001"
        standards = agent.get_standards()
        assert "IFRS 15" in standards or "ASC 606" in standards
    
    def test_lease_agent_creation(self):
        """Test lease accounting agent"""
        agent = get_accounting_agent("acct-lease-001", "test-org")
        assert agent.agent_id == "acct-lease-001"
        assert agent.category == "lease-accounting"
    
    @pytest.mark.asyncio
    async def test_accounting_query(self):
        """Test accounting agent query"""
        agent = get_accounting_agent("acct-finstat-001", "test-org")
        response = await agent.process_query(
            "How do I prepare a balance sheet under IFRS?",
            {}
        )
        assert 'accounting_entries' in response
        assert 'citations' in response


class TestAgentOrchestration:
    """Test suite for agent orchestration"""
    
    @pytest.mark.asyncio
    async def test_single_agent_routing(self):
        """Test single agent routing"""
        orchestrator = AgentOrchestrator("test-org")
        response = await orchestrator.route_query(
            "What is the VAT treatment for this transaction?",
            {"jurisdiction": "EU"}
        )
        assert 'agent_id' in response
    
    @pytest.mark.asyncio
    async def test_multi_agent_workflow(self):
        """Test multi-agent workflow"""
        orchestrator = AgentOrchestrator("test-org")
        response = await orchestrator.route_query(
            "How does the tax treatment affect the IFRS accounting for this lease?",
            {"jurisdiction": "US"}
        )
        assert 'workflow_type' in response
        assert response['workflow_type'] == 'multi-agent'
        assert 'responses' in response
        assert 'accounting' in response['responses']
        assert 'tax' in response['responses']
    
    def test_execution_history(self):
        """Test execution history tracking"""
        orchestrator = AgentOrchestrator("test-org")
        history = orchestrator.get_execution_history()
        assert isinstance(history, list)


class TestAgentIntegration:
    """Integration tests"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_tax_query(self):
        """Test end-to-end tax query"""
        agent = get_tax_agent("tax-tp-global-001", "test-org")
        response = await agent.process_query(
            "How do I calculate an arm's length transfer price?",
            {"method": "TNMM", "transaction_value": 1000000}
        )
        assert response['confidence'] > 0.5
        assert len(response['citations']) > 0
    
    @pytest.mark.asyncio
    async def test_end_to_end_accounting_query(self):
        """Test end-to-end accounting query"""
        agent = get_accounting_agent("acct-cashflow-001", "test-org")
        response = await agent.process_query(
            "How do I prepare a cash flow statement using the indirect method?",
            {}
        )
        assert len(response['follow_up_actions']) > 0


# Performance tests
class TestPerformance:
    """Performance tests for agents"""
    
    @pytest.mark.asyncio
    async def test_agent_response_time(self):
        """Test agent response time is acceptable"""
        import time
        agent = get_tax_agent("tax-corp-us-050", "test-org")
        
        start = time.time()
        await agent.process_query("What is the corporate tax rate?", {})
        duration = time.time() - start
        
        assert duration < 5.0  # Should respond within 5 seconds
    
    def test_agent_creation_performance(self):
        """Test agent creation is fast"""
        import time
        
        start = time.time()
        for _ in range(20):
            get_tax_agent("tax-corp-us-050", "test-org")
        duration = time.time() - start
        
        assert duration < 1.0  # Should create 20 agents in under 1 second

"""
Quick API Test for Agent System

Simple smoke tests to verify API endpoints are working.
Run with: pytest tests/test_agent_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)


def test_list_agents():
    """Test listing all agents"""
    response = client.get("/api/agents")
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 12  # All 12 tax agents
    
    # Check first agent structure
    agent = data[0]
    assert "id" in agent
    assert "slug" in agent
    assert "name" in agent
    assert "category" in agent
    assert agent["category"] == "tax"


def test_get_agent_by_slug():
    """Test getting specific agent by slug"""
    response = client.get("/api/agents/tax-corp-eu-022")
    assert response.status_code == 200
    
    agent = response.json()
    assert agent["slug"] == "tax-corp-eu-022"
    assert agent["name"] == "EU Corporate Tax Specialist"
    assert agent["category"] == "tax"
    assert agent["is_active"] is True


def test_get_nonexistent_agent():
    """Test 404 for non-existent agent"""
    response = client.get("/api/agents/invalid-agent-999")
    assert response.status_code == 404


def test_get_agent_capabilities():
    """Test getting agent capabilities"""
    response = client.get("/api/agents/tax-corp-eu-022/capabilities")
    assert response.status_code == 200
    
    data = response.json()
    assert "slug" in data
    assert "capabilities" in data
    assert isinstance(data["capabilities"], list)
    assert len(data["capabilities"]) > 0


def test_filter_agents_by_category():
    """Test filtering agents by category"""
    response = client.get("/api/agents?category=tax")
    assert response.status_code == 200
    
    agents = response.json()
    assert all(agent["category"] == "tax" for agent in agents)


def test_execute_agent():
    """Test executing an agent"""
    payload = {
        "query": "What is the EU corporate tax rate?",
        "context": {"jurisdiction": "EU"},
        "stream": False
    }
    
    response = client.post("/api/executions/tax-corp-eu-022/execute", json=payload)
    assert response.status_code == 202  # Accepted
    
    execution = response.json()
    assert "id" in execution
    assert execution["agent_slug"] == "tax-corp-eu-022"
    assert execution["status"] == "pending"
    assert execution["input_data"]["query"] == payload["query"]


def test_execute_invalid_agent():
    """Test executing non-existent agent returns 404"""
    payload = {
        "query": "Test query"
    }
    
    response = client.post("/api/executions/invalid-agent/execute", json=payload)
    assert response.status_code == 404


def test_list_executions():
    """Test listing executions"""
    response = client.get("/api/executions")
    assert response.status_code == 200
    
    data = response.json()
    assert "executions" in data
    assert "total" in data
    assert "page" in data
    assert "page_size" in data


def test_execution_analytics():
    """Test execution analytics endpoint"""
    response = client.get("/api/executions/analytics/summary")
    assert response.status_code == 200
    
    data = response.json()
    assert "total_executions" in data
    assert "success_rate" in data
    assert "avg_duration_ms" in data
    assert "total_cost_usd" in data
    assert "total_tokens" in data


def test_pagination():
    """Test pagination parameters"""
    response = client.get("/api/agents?skip=0&limit=5")
    assert response.status_code == 200
    
    agents = response.json()
    assert len(agents) <= 5


def test_agent_versioning():
    """Test that agents have version tracking"""
    response = client.get("/api/agents/tax-corp-us-023")
    assert response.status_code == 200
    
    agent = response.json()
    assert "version" in agent
    assert agent["version"] >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

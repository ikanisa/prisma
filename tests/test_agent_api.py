"""Quick smoke tests for agent and execution APIs."""

import os
from copy import deepcopy
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

# Ensure required environment variables exist before importing the app
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "testing-secret")
os.environ.setdefault("SUPABASE_JWT_AUDIENCE", "authenticated")

from server.main import app  # noqa: E402
from server.api import agents as agents_api  # noqa: E402
from server.api import executions as executions_api  # noqa: E402
from server.api.executions import ExecutionStatus  # noqa: E402


class FakeAgentRepo:
    def __init__(self):
        self._agents = {
            "tax-corp-eu-022": {
                "id": str(uuid4()),
                "organization_id": str(uuid4()),
                "slug": "tax-corp-eu-022",
                "name": "EU Corporate Tax Specialist",
                "description": "Handles EU corporate tax",
                "category": "tax",
                "type": "specialist",
                "status": "active",
                "is_public": True,
                "avatar_url": None,
                "version": "1.0.0",
                "created_by": None,
                "parent_version_id": None,
                "created_at": "2025-01-01T00:00:00",
                "updated_at": "2025-01-01T00:00:00",
                "published_at": None,
            },
            "tax-corp-us-023": {
                "id": str(uuid4()),
                "organization_id": str(uuid4()),
                "slug": "tax-corp-us-023",
                "name": "US Corporate Tax Specialist",
                "description": "Handles US corporate tax",
                "category": "tax",
                "type": "specialist",
                "status": "testing",
                "is_public": True,
                "avatar_url": None,
                "version": "2.0.0",
                "created_by": None,
                "parent_version_id": None,
                "created_at": "2025-01-02T00:00:00",
                "updated_at": "2025-01-02T00:00:00",
                "published_at": None,
            },
        }

    async def get_all_agents(
        self,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        organization_id: Optional[str] = None,
        agent_type: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        include_count: bool = False,
    ):
        agents = list(self._agents.values())
        if category:
            agents = [a for a in agents if a["category"] == category]
        if status:
            agents = [a for a in agents if a["status"] == status]
        if agent_type:
            agents = [a for a in agents if a["type"] == agent_type]
        if search:
            term = search.lower()
            agents = [a for a in agents if term in a["name"].lower()]

        start = offset or 0
        end = start + (limit or len(agents))
        sliced = agents[start:end]

        if include_count:
            return deepcopy(sliced), len(agents)
        return deepcopy(sliced)

    async def get_agent_by_slug(self, slug: str, organization_id: Optional[str] = None):
        agent = self._agents.get(slug)
        return deepcopy(agent) if agent else None

    async def get_agent_by_id(self, agent_id: str, organization_id: Optional[str] = None):
        for agent in self._agents.values():
            if agent["id"] == agent_id:
                return deepcopy(agent)
        return None

    async def create_agent(self, agent_data: Dict[str, Any]):
        agent_id = str(uuid4())
        record = {
            **agent_data,
            "id": agent_id,
            "created_at": "2025-02-01T00:00:00",
            "updated_at": "2025-02-01T00:00:00",
        }
        self._agents[record["slug"]] = record
        return deepcopy(record)

    async def update_agent(self, agent_id: str, updates: Dict[str, Any]):
        for slug, agent in self._agents.items():
            if agent["id"] == agent_id:
                agent.update(updates)
                agent["updated_at"] = "2025-02-02T00:00:00"
                self._agents[slug] = agent
                return deepcopy(agent)
        return None

    async def delete_agent(self, agent_id: str) -> bool:
        for slug, agent in list(self._agents.items()):
            if agent["id"] == agent_id:
                del self._agents[slug]
                return True
        return False


class FakeExecutionRepo:
    def __init__(self, agent_repo: FakeAgentRepo):
        self._records: Dict[str, Dict[str, Any]] = {}
        self._agent_repo = agent_repo

    async def create_execution(self, execution_data: Dict[str, Any]):
        exec_id = str(uuid4())
        record = {
            "id": exec_id,
            "agent_id": execution_data["agent_id"],
            "status": execution_data["status"],
            "query": execution_data["query"],
            "context": execution_data.get("context", {}),
            "created_at": "2025-03-01T00:00:00",
        }
        self._records[exec_id] = record
        executions_api._executions_db = executions_api._executions_db if hasattr(executions_api, "_executions_db") else {}
        executions_api._executions_db[UUID(exec_id)] = {
            "agent_slug": next(
                slug for slug, a in self._agent_repo._agents.items() if a["id"] == execution_data["agent_id"]
            ),
            "status": ExecutionStatus.PENDING,
            "duration_ms": 0,
            "cost_usd": 0,
            "tokens_used": 0,
        }
        return record

    async def update_execution_status(
        self,
        execution_id: str,
        status: str,
        result: Dict[str, Any] | None = None,
        error: str | None = None,
        metrics: Dict[str, Any] | None = None,
    ):
        record = self._records.get(execution_id)
        if record:
            record["status"] = status
            record["result"] = result
        return record

    async def get_execution_by_id(self, execution_id: str):
        return self._records.get(execution_id)

    async def get_recent_executions(self, limit: int = 10, status: Optional[str] = None):
        records = list(self._records.values())
        if status:
            records = [r for r in records if r.get("status") == status]
        return records[:limit]

    async def get_executions_by_agent(
        self,
        agent_id: str,
        status: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ):
        records = [r for r in self._records.values() if r["agent_id"] == agent_id]
        if status:
            records = [r for r in records if r.get("status") == status]
        start = offset or 0
        end = start + (limit or len(records))
        return records[start:end]


fake_agent_repo = FakeAgentRepo()
fake_execution_repo = FakeExecutionRepo(fake_agent_repo)
agents_api.agent_repo = fake_agent_repo
executions_api.agent_repo = fake_agent_repo
executions_api.execution_repo = fake_execution_repo
executions_api._executions_db = {}


async def _noop_execute_agent_async(*args, **kwargs):
    return None


executions_api._execute_agent_async = _noop_execute_agent_async

client = TestClient(app)


def test_list_agents():
    """Test listing all agents"""
    response = client.get("/api/v1/agents")
    assert response.status_code == 200
    
    data = response.json()
    assert data["total"] == 2
    assert len(data["agents"]) == 2
    
    # Check first agent structure
    agent = data["agents"][0]
    assert "id" in agent
    assert "slug" in agent
    assert "name" in agent
    assert "category" in agent
    assert agent["category"] == "tax"


def test_get_agent_by_slug():
    """Test getting specific agent by slug"""
    response = client.get("/api/v1/agents/tax-corp-eu-022")
    assert response.status_code == 200
    
    agent = response.json()
    assert agent["slug"] == "tax-corp-eu-022"
    assert agent["name"] == "EU Corporate Tax Specialist"
    assert agent["category"] == "tax"
    assert agent["is_active"] is True


def test_get_nonexistent_agent():
    """Test 404 for non-existent agent"""
    response = client.get("/api/v1/agents/invalid-agent-999")
    assert response.status_code == 404


def test_get_agent_capabilities():
    """Test getting agent capabilities"""
    response = client.get("/api/v1/agents/tax-corp-eu-022/capabilities")
    assert response.status_code == 200
    
    data = response.json()
    assert "slug" in data
    assert "capabilities" in data
    assert isinstance(data["capabilities"], list)
    assert len(data["capabilities"]) > 0


def test_filter_agents_by_category():
    """Test filtering agents by category"""
    response = client.get("/api/v1/agents?category=tax")
    assert response.status_code == 200
    
    agents = response.json()["agents"]
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
    response = client.get("/api/v1/agents?page=1&page_size=1")
    assert response.status_code == 200
    
    agents = response.json()["agents"]
    assert len(agents) == 1


def test_agent_versioning():
    """Test that agents have version tracking"""
    response = client.get("/api/v1/agents/tax-corp-us-023")
    assert response.status_code == 200
    
    agent = response.json()
    assert agent["version"] == "2.0.0"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Tests for Tools API
"""

import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from server.main import app

client = TestClient(app)


@pytest.fixture
def sample_tool_data():
    return {
        "organization_id": str(uuid4()),
        "name": "Tax Calculator",
        "description": "Calculates tax liabilities",
        "category": "calculation",
        "schema_definition": {
            "type": "object",
            "properties": {
                "income": {"type": "number"},
                "deductions": {"type": "number"}
            },
            "required": ["income"]
        },
        "is_public": False,
        "requires_approval": False
    }


class TestToolsAPI:
    def test_create_tool(self, sample_tool_data):
        response = client.post("/api/v1/tools", json=sample_tool_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_tool_data["name"]
        assert data["usage_count"] == 0
        assert "id" in data

    def test_list_tools(self, sample_tool_data):
        client.post("/api/v1/tools", json=sample_tool_data)
        response = client.get("/api/v1/tools")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_tool(self, sample_tool_data):
        create_resp = client.post("/api/v1/tools", json=sample_tool_data)
        tool_id = create_resp.json()["id"]
        
        response = client.get(f"/api/v1/tools/{tool_id}")
        assert response.status_code == 200
        assert response.json()["id"] == tool_id

    def test_update_tool(self, sample_tool_data):
        create_resp = client.post("/api/v1/tools", json=sample_tool_data)
        tool_id = create_resp.json()["id"]
        
        update_data = {"name": "Updated Tool"}
        response = client.put(f"/api/v1/tools/{tool_id}", json=update_data)
        
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Tool"

    def test_delete_tool(self, sample_tool_data):
        create_resp = client.post("/api/v1/tools", json=sample_tool_data)
        tool_id = create_resp.json()["id"]
        
        response = client.delete(f"/api/v1/tools/{tool_id}")
        assert response.status_code == 204

    def test_test_tool(self, sample_tool_data):
        create_resp = client.post("/api/v1/tools", json=sample_tool_data)
        tool_id = create_resp.json()["id"]
        
        response = client.post(f"/api/v1/tools/{tool_id}/test", json={"income": 50000})
        assert response.status_code == 200
        assert "test_result" in response.json()

    def test_assign_tool(self, sample_tool_data):
        create_resp = client.post("/api/v1/tools", json=sample_tool_data)
        tool_id = create_resp.json()["id"]
        
        assignment = {
            "agent_id": str(uuid4()),
            "tool_id": tool_id,
            "is_enabled": True
        }
        response = client.post(f"/api/v1/tools/{tool_id}/assign", json=assignment)
        assert response.status_code == 201
        assert "assignment_id" in response.json()

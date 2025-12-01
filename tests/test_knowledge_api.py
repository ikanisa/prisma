"""
Tests for Knowledge API
"""

import pytest
from fastapi.testclient import TestClient
from uuid import uuid4
from server.main import app
from io import BytesIO

client = TestClient(app)


@pytest.fixture
def sample_knowledge_data():
    return {
        "organization_id": str(uuid4()),
        "name": "Tax Regulations 2024",
        "description": "Latest tax regulations",
        "source_type": "manual",
        "content_type": "text",
        "content": "Sample tax regulation content",
        "is_active": True
    }


class TestKnowledgeAPI:
    def test_create_knowledge(self, sample_knowledge_data):
        response = client.post("/api/v1/knowledge", json=sample_knowledge_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_knowledge_data["name"]
        assert data["vector_indexed"] is False
        assert data["chunk_count"] == 0

    def test_upload_file(self):
        file_content = b"Sample PDF content"
        files = {"file": ("test.pdf", BytesIO(file_content), "application/pdf")}
        params = {
            "name": "Test Upload",
            "organization_id": str(uuid4())
        }
        
        response = client.post("/api/v1/knowledge/upload", files=files, params=params)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Upload"
        assert "file_url" in data

    def test_list_knowledge(self, sample_knowledge_data):
        client.post("/api/v1/knowledge", json=sample_knowledge_data)
        response = client.get("/api/v1/knowledge")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_knowledge(self, sample_knowledge_data):
        create_resp = client.post("/api/v1/knowledge", json=sample_knowledge_data)
        knowledge_id = create_resp.json()["id"]
        
        response = client.get(f"/api/v1/knowledge/{knowledge_id}")
        assert response.status_code == 200
        assert response.json()["id"] == knowledge_id

    def test_update_knowledge(self, sample_knowledge_data):
        create_resp = client.post("/api/v1/knowledge", json=sample_knowledge_data)
        knowledge_id = create_resp.json()["id"]
        
        update_data = {"name": "Updated Knowledge"}
        response = client.put(f"/api/v1/knowledge/{knowledge_id}", json=update_data)
        
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Knowledge"

    def test_delete_knowledge(self, sample_knowledge_data):
        create_resp = client.post("/api/v1/knowledge", json=sample_knowledge_data)
        knowledge_id = create_resp.json()["id"]
        
        response = client.delete(f"/api/v1/knowledge/{knowledge_id}")
        assert response.status_code == 204

    def test_reindex_knowledge(self, sample_knowledge_data):
        create_resp = client.post("/api/v1/knowledge", json=sample_knowledge_data)
        knowledge_id = create_resp.json()["id"]
        
        response = client.post(f"/api/v1/knowledge/{knowledge_id}/reindex")
        assert response.status_code == 200
        assert response.json()["status"] == "indexing"

    def test_search_knowledge(self):
        search_query = {
            "query": "tax rates",
            "limit": 5,
            "min_score": 0.7
        }
        response = client.post("/api/v1/knowledge/search", json=search_query)
        assert response.status_code == 200
        results = response.json()
        assert isinstance(results, list)
        assert all(r["score"] >= 0.7 for r in results)

    def test_assign_knowledge(self, sample_knowledge_data):
        create_resp = client.post("/api/v1/knowledge", json=sample_knowledge_data)
        knowledge_id = create_resp.json()["id"]
        
        assignment = {
            "agent_id": str(uuid4()),
            "knowledge_id": knowledge_id,
            "priority": 1,
            "is_enabled": True
        }
        response = client.post(f"/api/v1/knowledge/{knowledge_id}/assign", json=assignment)
        assert response.status_code == 201
        assert "assignment_id" in response.json()

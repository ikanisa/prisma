"""
Tests for Database Service

Tests the database service layer with mocked HTTP responses.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from server.services.database_service import DatabaseService, get_database_service


@pytest.fixture
def mock_httpx_client():
    """Mock httpx.AsyncClient for testing."""
    client = AsyncMock(spec=httpx.AsyncClient)
    return client


@pytest.fixture
def db_service(mock_httpx_client, monkeypatch):
    """Create database service with mocked client."""
    # Set environment variables
    monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")
    
    # Create service
    service = DatabaseService()
    
    # Replace client with mock
    service.client = mock_httpx_client
    
    return service


class TestDatabaseService:
    """Test database service operations."""
    
    def test_initialization_success(self, monkeypatch):
        """Test successful service initialization."""
        monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")
        
        service = DatabaseService()
        
        assert service.supabase_url == "https://test.supabase.co"
        assert service.supabase_key == "test-key"
        assert service.base_url == "https://test.supabase.co/rest/v1"
    
    def test_initialization_missing_url(self, monkeypatch):
        """Test initialization fails without URL."""
        monkeypatch.delenv("SUPABASE_URL", raising=False)
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")
        
        with pytest.raises(ValueError, match="SUPABASE_URL"):
            DatabaseService()
    
    def test_initialization_missing_key(self, monkeypatch):
        """Test initialization fails without key."""
        monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
        monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
        
        with pytest.raises(ValueError, match="SUPABASE_SERVICE_ROLE_KEY"):
            DatabaseService()
    
    @pytest.mark.asyncio
    async def test_query_success(self, db_service):
        """Test successful query operation."""
        # Mock response
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {"id": "1", "name": "Agent 1"},
            {"id": "2", "name": "Agent 2"}
        ]
        mock_response.raise_for_status = MagicMock()
        
        db_service.client.get = AsyncMock(return_value=mock_response)
        
        # Execute query
        results = await db_service.query(
            table="agent_profiles",
            select="*",
            filters={"is_active": True},
            limit=10
        )
        
        assert len(results) == 2
        assert results[0]["name"] == "Agent 1"
        
        # Verify call
        db_service.client.get.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_query_with_operators(self, db_service):
        """Test query with filter operators."""
        mock_response = MagicMock()
        mock_response.json.return_value = []
        mock_response.raise_for_status = MagicMock()
        
        db_service.client.get = AsyncMock(return_value=mock_response)
        
        await db_service.query(
            table="agent_executions",
            filters={"tokens_used": {"gt": 1000}}
        )
        
        # Verify parameters
        call_args = db_service.client.get.call_args
        assert "tokens_used=gt.1000" in str(call_args)
    
    @pytest.mark.asyncio
    async def test_insert_success(self, db_service):
        """Test successful insert operation."""
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {"id": "123", "name": "New Agent"}
        ]
        mock_response.raise_for_status = MagicMock()
        
        db_service.client.post = AsyncMock(return_value=mock_response)
        
        result = await db_service.insert(
            table="agent_profiles",
            data={"name": "New Agent"}
        )
        
        assert result[0]["id"] == "123"
        db_service.client.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_insert_upsert(self, db_service):
        """Test upsert operation."""
        mock_response = MagicMock()
        mock_response.json.return_value = [{"id": "123"}]
        mock_response.raise_for_status = MagicMock()
        
        db_service.client.post = AsyncMock(return_value=mock_response)
        
        await db_service.insert(
            table="agent_profiles",
            data={"name": "Agent"},
            upsert=True
        )
        
        # Verify upsert header
        call_args = db_service.client.post.call_args
        headers = call_args.kwargs["headers"]
        assert "merge-duplicates" in headers["Prefer"]
    
    @pytest.mark.asyncio
    async def test_update_success(self, db_service):
        """Test successful update operation."""
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {"id": "123", "name": "Updated Agent"}
        ]
        mock_response.raise_for_status = MagicMock()
        
        db_service.client.patch = AsyncMock(return_value=mock_response)
        
        result = await db_service.update(
            table="agent_profiles",
            filters={"id": "123"},
            data={"name": "Updated Agent"}
        )
        
        assert result[0]["name"] == "Updated Agent"
        db_service.client.patch.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_delete_success(self, db_service):
        """Test successful delete operation."""
        mock_response = MagicMock()
        mock_response.json.return_value = [{"id": "123"}]
        mock_response.raise_for_status = MagicMock()
        
        db_service.client.delete = AsyncMock(return_value=mock_response)
        
        result = await db_service.delete(
            table="agent_profiles",
            filters={"id": "123"}
        )
        
        assert result[0]["id"] == "123"
        db_service.client.delete.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_query_http_error(self, db_service):
        """Test query handles HTTP errors."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "Not found", request=MagicMock(), response=mock_response
        )
        
        db_service.client.get = AsyncMock(return_value=mock_response)
        
        with pytest.raises(httpx.HTTPStatusError):
            await db_service.query(table="invalid_table")
    
    @pytest.mark.asyncio
    async def test_close(self, db_service):
        """Test closing database connections."""
        db_service.client.aclose = AsyncMock()
        
        await db_service.close()
        
        db_service.client.aclose.assert_called_once()
    
    def test_singleton_pattern(self, monkeypatch):
        """Test get_database_service returns singleton."""
        monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
        monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")
        
        # Clear cache
        get_database_service.cache_clear()
        
        service1 = get_database_service()
        service2 = get_database_service()
        
        assert service1 is service2

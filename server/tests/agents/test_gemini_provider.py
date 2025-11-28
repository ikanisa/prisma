"""
Tests for Gemini Agent Provider
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from server.agents.gemini_provider import GeminiAgentProvider
from server.agents.base import AgentToolDefinition, AgentProvider


@pytest.fixture
def gemini_provider():
    """Create Gemini provider instance"""
    with patch.dict('os.environ', {'GOOGLE_API_KEY': 'test-key'}):
        with patch('google.generativeai.configure'):
            return GeminiAgentProvider()


@pytest.mark.asyncio
async def test_create_agent(gemini_provider):
    """Test Gemini agent creation"""
    with patch('google.generativeai.GenerativeModel') as mock_model:
        agent_id = await gemini_provider.create_agent(
            name="Test Agent",
            instructions="You are a test agent",
            tools=[],
            model="gemini-2.0-flash-exp"
        )

        assert agent_id is not None
        assert agent_id in gemini_provider.agents
        assert gemini_provider.agents[agent_id]["name"] == "Test Agent"


@pytest.mark.asyncio
async def test_run_agent(gemini_provider):
    """Test Gemini agent execution"""
    with patch('google.generativeai.GenerativeModel') as mock_model_class:
        # Create agent
        agent_id = await gemini_provider.create_agent(
            name="Test Agent",
            instructions="You are helpful",
            tools=[],
            model="gemini-2.0-flash-exp"
        )

        # Mock response
        mock_response = MagicMock()
        mock_response.text = "Test response from Gemini"
        mock_response.usage_metadata.prompt_token_count = 10
        mock_response.usage_metadata.candidates_token_count = 20
        mock_response.usage_metadata.total_token_count = 30
        mock_response.candidates = []

        gemini_provider.agents[agent_id]["model"].generate_content_async = AsyncMock(
            return_value=mock_response
        )

        # Execute
        response = await gemini_provider.run_agent(
            agent_id=agent_id,
            input_text="Hello"
        )

        assert response.content == "Test response from Gemini"
        assert response.provider == AgentProvider.GEMINI
        assert response.usage["total_tokens"] == 30


@pytest.mark.asyncio
async def test_run_with_grounding(gemini_provider):
    """Test Gemini with Google Search grounding"""
    with patch('google.generativeai.GenerativeModel') as mock_model_class:
        agent_id = await gemini_provider.create_agent(
            name="Research Agent",
            instructions="You are a researcher",
            tools=[],
            model="gemini-2.0-flash-exp"
        )

        # Mock grounded response
        mock_response = MagicMock()
        mock_response.text = "Grounded response"
        mock_response.usage_metadata.prompt_token_count = 15
        mock_response.usage_metadata.candidates_token_count = 25
        mock_response.usage_metadata.total_token_count = 40

        # Mock grounding metadata
        mock_chunk = MagicMock()
        mock_chunk.web.uri = "https://example.com"
        mock_chunk.web.title = "Example Source"

        mock_candidate = MagicMock()
        mock_candidate.grounding_metadata.grounding_chunks = [mock_chunk]
        mock_candidate.grounding_metadata.web_search_queries = ["test query"]

        mock_response.candidates = [mock_candidate]

        mock_model_instance = MagicMock()
        mock_model_instance.generate_content_async = AsyncMock(return_value=mock_response)
        mock_model_class.return_value = mock_model_instance

        response = await gemini_provider.run_with_grounding(
            agent_id=agent_id,
            input_text="What is AI?",
            enable_search=True
        )

        assert response.content == "Grounded response"
        assert response.metadata.get("grounded") is True
        assert len(response.metadata["grounding_metadata"]["grounding_chunks"]) > 0


@pytest.mark.asyncio
async def test_stream_agent(gemini_provider):
    """Test Gemini streaming"""
    with patch('google.generativeai.GenerativeModel') as mock_model_class:
        agent_id = await gemini_provider.create_agent(
            name="Test Agent",
            instructions="You are helpful",
            tools=[],
            model="gemini-2.0-flash-exp"
        )

        # Mock streaming
        async def mock_stream():
            chunks = [
                MagicMock(text="Hello"),
                MagicMock(text=" from Gemini"),
            ]
            for chunk in chunks:
                yield chunk

        gemini_provider.agents[agent_id]["model"].generate_content_async = AsyncMock(
            return_value=mock_stream()
        )

        responses = []
        async for response in gemini_provider.stream_agent(agent_id=agent_id, input_text="Hi"):
            responses.append(response)

        assert len(responses) == 2
        assert responses[0].content == "Hello"
        assert responses[1].content == " from Gemini"

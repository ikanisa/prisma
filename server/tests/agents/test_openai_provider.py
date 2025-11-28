"""
Tests for OpenAI Agent Provider
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from server.agents.openai_provider import OpenAIAgentProvider
from server.agents.base import AgentToolDefinition, AgentProvider


@pytest.fixture
def openai_provider():
    """Create OpenAI provider instance"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        return OpenAIAgentProvider()


@pytest.fixture
def sample_tools():
    """Sample tool definitions"""
    return [
        AgentToolDefinition(
            name="get_weather",
            description="Get current weather",
            parameters={
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                }
            }
        )
    ]


@pytest.mark.asyncio
async def test_create_agent(openai_provider, sample_tools):
    """Test agent creation"""
    agent_id = await openai_provider.create_agent(
        name="Test Agent",
        instructions="You are a test agent",
        tools=sample_tools,
        model="gpt-4o"
    )

    assert agent_id is not None
    assert agent_id in openai_provider.agents
    assert openai_provider.agents[agent_id]["name"] == "Test Agent"


@pytest.mark.asyncio
async def test_run_agent(openai_provider, sample_tools):
    """Test agent execution"""
    # Create agent
    agent_id = await openai_provider.create_agent(
        name="Test Agent",
        instructions="You are a helpful assistant",
        tools=[],
        model="gpt-4o"
    )

    # Mock OpenAI client
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Test response"
    mock_response.choices[0].message.tool_calls = None
    mock_response.choices[0].finish_reason = "stop"
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 20
    mock_response.usage.total_tokens = 30

    openai_provider.client.chat.completions.create = AsyncMock(return_value=mock_response)

    # Execute
    response = await openai_provider.run_agent(
        agent_id=agent_id,
        input_text="Hello"
    )

    assert response.content == "Test response"
    assert response.provider == AgentProvider.OPENAI
    assert response.usage["total_tokens"] == 30


@pytest.mark.asyncio
async def test_stream_agent(openai_provider):
    """Test agent streaming"""
    agent_id = await openai_provider.create_agent(
        name="Test Agent",
        instructions="You are a helpful assistant",
        tools=[],
        model="gpt-4o"
    )

    # Mock streaming response
    async def mock_stream():
        chunks = [
            MagicMock(choices=[MagicMock(delta=MagicMock(content="Hello", tool_calls=None))]),
            MagicMock(choices=[MagicMock(delta=MagicMock(content=" World", tool_calls=None))]),
        ]
        for chunk in chunks:
            yield chunk

    openai_provider.client.chat.completions.create = AsyncMock(return_value=mock_stream())

    # Collect streamed responses
    responses = []
    async for response in openai_provider.stream_agent(agent_id=agent_id, input_text="Hi"):
        responses.append(response)

    assert len(responses) == 2
    assert responses[0].content == "Hello"
    assert responses[1].content == " World"


@pytest.mark.asyncio
async def test_tool_conversion(openai_provider, sample_tools):
    """Test tool definition conversion"""
    converted = openai_provider._convert_tools(sample_tools)

    assert len(converted) == 1
    assert converted[0]["type"] == "function"
    assert converted[0]["function"]["name"] == "get_weather"
    assert "location" in converted[0]["function"]["parameters"]["properties"]

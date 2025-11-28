"""
OpenAI Service Integration Tests

Tests the OpenAI service with real or mocked API calls.
For real API tests, set OPENAI_API_KEY environment variable.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from server.services.openai_service import (
    OpenAIService,
    AgentExecutionConfig,
    ExecutionResult,
    ModelType,
    get_openai_service
)


@pytest.mark.asyncio
async def test_openai_service_initialization():
    """Test OpenAI service can be initialized"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        assert service.api_key == 'test-key'
        assert service.max_retries == 3
        assert service.timeout == 60


@pytest.mark.asyncio
async def test_openai_service_no_api_key():
    """Test that service raises error without API key"""
    with patch.dict('os.environ', {}, clear=True):
        with pytest.raises(ValueError, match="OpenAI API key"):
            OpenAIService()


@pytest.mark.asyncio
async def test_execute_agent_with_mock():
    """Test agent execution with mocked OpenAI response"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        
        # Mock the OpenAI client response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Test tax guidance response"
        mock_response.choices[0].finish_reason = "stop"
        mock_response.usage.total_tokens = 100
        mock_response.usage.prompt_tokens = 50
        mock_response.usage.completion_tokens = 50
        
        service.client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Execute agent
        result = await service.execute_agent(
            agent_slug="tax-corp-eu-022",
            query="What is the corporate tax rate in Ireland?"
        )
        
        # Verify result
        assert isinstance(result, ExecutionResult)
        assert result.answer == "Test tax guidance response"
        assert result.tokens_used == 100
        assert result.cost_usd > 0
        assert result.duration_ms > 0
        assert result.finish_reason == "stop"


@pytest.mark.asyncio
async def test_agent_system_messages():
    """Test that different agents get different system messages"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        
        eu_message = service._get_agent_system_message("tax-corp-eu-022")
        us_message = service._get_agent_system_message("tax-corp-us-023")
        
        assert "EU Corporate Tax" in eu_message
        assert "ATAD" in eu_message
        
        assert "US Corporate Tax" in us_message
        assert "IRC" in us_message


@pytest.mark.asyncio
async def test_cost_calculation():
    """Test accurate cost calculation for different models"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        
        # GPT-4o-mini: $0.00015/1K input, $0.0006/1K output
        cost = service._calculate_cost(
            model=ModelType.GPT_4O_MINI.value,
            input_tokens=1000,
            output_tokens=1000
        )
        
        # (1000/1000 * 0.00015) + (1000/1000 * 0.0006) = 0.00075
        assert cost == pytest.approx(0.00075, rel=1e-6)


@pytest.mark.asyncio
async def test_extract_sources():
    """Test source extraction from answer"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        
        answer = "According to IRC Section 1234 and OECD Guidelines..."
        sources = service._extract_sources(answer)
        
        assert sources is not None
        assert "Internal Revenue Code" in sources
        assert "OECD Guidelines" in sources


@pytest.mark.asyncio
async def test_confidence_estimation():
    """Test confidence estimation based on answer content"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        
        # High confidence (no uncertainty markers)
        high_conf_answer = "The corporate tax rate is 25%."
        high_conf = service._estimate_confidence(high_conf_answer)
        assert high_conf == 0.95
        
        # Lower confidence (uncertainty markers)
        low_conf_answer = "The rate may be 25%, but it could vary."
        low_conf = service._estimate_confidence(low_conf_answer)
        assert low_conf < 0.95


@pytest.mark.asyncio
async def test_extract_warnings():
    """Test warning extraction"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        
        answer = "Please consult with a tax advisor. Rules may vary by jurisdiction."
        warnings = service._extract_warnings(answer)
        
        assert warnings is not None
        assert len(warnings) == 2
        assert any("advisor" in w.lower() for w in warnings)
        assert any("jurisdiction" in w.lower() for w in warnings)


@pytest.mark.asyncio
async def test_retry_on_rate_limit():
    """Test that service retries on rate limit errors"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService(max_retries=2)
        
        # Mock rate limit error then success
        from openai import RateLimitError
        
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Success"
        mock_response.choices[0].finish_reason = "stop"
        mock_response.usage.total_tokens = 50
        mock_response.usage.prompt_tokens = 25
        mock_response.usage.completion_tokens = 25
        
        # Fail once, then succeed
        service.client.chat.completions.create = AsyncMock(
            side_effect=[
                RateLimitError("Rate limit exceeded", response=None, body=None),
                mock_response
            ]
        )
        
        config = AgentExecutionConfig()
        result = await service._execute_with_retry(
            messages=[{"role": "user", "content": "test"}],
            config=config
        )
        
        assert result.choices[0].message.content == "Success"


@pytest.mark.asyncio
async def test_singleton_service():
    """Test that get_openai_service returns singleton"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service1 = get_openai_service()
        service2 = get_openai_service()
        
        assert service1 is service2


@pytest.mark.asyncio
async def test_context_injection():
    """Test that context is properly injected into user message"""
    with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
        service = OpenAIService()
        
        query = "What is the tax rate?"
        context = {
            "jurisdiction": "Ireland",
            "year": "2024"
        }
        
        message = service._build_user_message(query, context)
        
        assert query in message
        assert "jurisdiction" in message
        assert "Ireland" in message
        assert "2024" in message


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

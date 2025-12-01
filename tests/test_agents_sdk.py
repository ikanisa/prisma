"""
Tests for the OpenAI Agents SDK and Gemini ADK integration

Tests cover:
- Provider initialization
- Agent creation
- Basic tool definitions
- Streaming event types
- Orchestrator functionality
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from server.agents.base import (
    AgentProvider,
    AgentToolDefinition,
    AgentHandoff,
    Guardrail,
    AgentResponse,
    StreamingAgentEvent,
    StreamingEventType,
    AgentTrace,
)
from server.agents.openai_agents_sdk import OpenAIAgentsSDKProvider
from server.agents.gemini_adk import GeminiADKProvider
from server.agents.orchestrator import (
    UnifiedAgentOrchestrator,
    ExecutionMetrics,
    ABTestConfig,
    ABTestVariant,
)


class TestAgentProviderEnum:
    """Test AgentProvider enum values"""
    
    def test_openai_agents_sdk_provider_exists(self):
        assert AgentProvider.OPENAI_AGENTS_SDK.value == "openai-agents"
    
    def test_gemini_adk_provider_exists(self):
        assert AgentProvider.GEMINI_ADK.value == "gemini-adk"
    
    def test_all_providers(self):
        expected = {"openai", "openai-agents", "gemini", "gemini-adk", "anthropic"}
        actual = {p.value for p in AgentProvider}
        assert expected == actual


class TestStreamingEventType:
    """Test StreamingEventType enum values"""
    
    def test_all_event_types(self):
        expected = {"text", "tool_call", "tool_result", "handoff", "guardrail", "error", "done"}
        actual = {e.value for e in StreamingEventType}
        assert expected == actual
    
    def test_text_event(self):
        event = StreamingAgentEvent(
            type=StreamingEventType.TEXT,
            content="Hello, world!",
            metadata={}
        )
        assert event.type == StreamingEventType.TEXT
        assert event.content == "Hello, world!"
    
    def test_tool_call_event(self):
        event = StreamingAgentEvent(
            type=StreamingEventType.TOOL_CALL,
            content="calculate_tax",
            tool_name="calculate_tax",
            tool_call_id="call_123",
            tool_arguments={"amount": 100}
        )
        assert event.type == StreamingEventType.TOOL_CALL
        assert event.tool_name == "calculate_tax"
        assert event.tool_call_id == "call_123"


class TestAgentToolDefinition:
    """Test AgentToolDefinition dataclass"""
    
    def test_basic_tool(self):
        tool = AgentToolDefinition(
            name="calculate_tax",
            description="Calculate tax on an amount",
            parameters={
                "type": "object",
                "properties": {
                    "amount": {"type": "number"},
                    "rate": {"type": "number"}
                },
                "required": ["amount", "rate"]
            }
        )
        assert tool.name == "calculate_tax"
        assert tool.handler is None
    
    def test_tool_with_handler(self):
        def my_handler(amount, rate):
            return amount * rate
        
        tool = AgentToolDefinition(
            name="calculate_tax",
            description="Calculate tax",
            parameters={},
            handler=my_handler
        )
        assert tool.handler is not None
        assert tool.handler(100, 0.1) == 10


class TestAgentHandoff:
    """Test AgentHandoff dataclass"""
    
    def test_handoff_creation(self):
        handoff = AgentHandoff(
            target_agent_id="agent_2",
            name="Tax Specialist Handoff",
            description="Hand off to tax specialist for complex queries"
        )
        assert handoff.target_agent_id == "agent_2"
        assert handoff.condition is None
    
    def test_handoff_with_condition(self):
        handoff = AgentHandoff(
            target_agent_id="agent_3",
            name="EU Tax Handoff",
            description="Hand off for EU-specific queries",
            condition="jurisdiction == 'EU'"
        )
        assert handoff.condition == "jurisdiction == 'EU'"


class TestGuardrail:
    """Test Guardrail dataclass"""
    
    def test_input_guardrail(self):
        guardrail = Guardrail(
            name="input_filter",
            description="Filter harmful input",
            type="input",
            config={"max_length": 1000}
        )
        assert guardrail.type == "input"
        assert guardrail.config["max_length"] == 1000
    
    def test_output_guardrail(self):
        guardrail = Guardrail(
            name="pii_filter",
            description="Filter PII from output",
            type="output"
        )
        assert guardrail.type == "output"


class TestAgentTrace:
    """Test AgentTrace dataclass"""
    
    def test_trace_creation(self):
        trace = AgentTrace(
            trace_id="trace_123",
            span_id="span_456",
            parent_span_id=None,
            operation="run_agent",
            start_time=1000.0,
            end_time=1500.0,
            status="completed"
        )
        assert trace.trace_id == "trace_123"
        assert trace.end_time - trace.start_time == 500.0


class TestOpenAIAgentsSDKProvider:
    """Test OpenAIAgentsSDKProvider initialization"""
    
    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    def test_provider_initialization(self):
        provider = OpenAIAgentsSDKProvider()
        assert provider.api_key == 'test-key'
        assert provider.default_model == "gpt-4o"
    
    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    def test_provider_with_custom_model(self):
        provider = OpenAIAgentsSDKProvider(model="gpt-4-turbo")
        assert provider.default_model == "gpt-4-turbo"


class TestGeminiADKProvider:
    """Test GeminiADKProvider initialization"""
    
    @patch.dict('os.environ', {'GOOGLE_API_KEY': 'test-key'})
    @patch('google.generativeai.configure')
    def test_provider_initialization(self, mock_configure):
        provider = GeminiADKProvider()
        assert provider.api_key == 'test-key'
        assert provider.default_model == "gemini-2.0-flash"
        mock_configure.assert_called_once_with(api_key='test-key')


class TestExecutionMetrics:
    """Test ExecutionMetrics dataclass"""
    
    def test_metrics_creation(self):
        metrics = ExecutionMetrics(
            execution_id="exec_123",
            agent_id="agent_456",
            provider=AgentProvider.OPENAI_AGENTS_SDK,
            start_time=1000.0,
            end_time=1500.0,
            latency_ms=500.0,
            input_tokens=100,
            output_tokens=200,
            total_tokens=300,
            success=True
        )
        assert metrics.success is True
        assert metrics.total_tokens == 300


class TestABTestConfig:
    """Test ABTestConfig dataclass"""
    
    def test_ab_test_creation(self):
        config = ABTestConfig(
            name="openai_vs_gemini",
            control_provider=AgentProvider.OPENAI_AGENTS_SDK,
            treatment_provider=AgentProvider.GEMINI_ADK,
            treatment_percentage=30.0,
            is_active=True
        )
        assert config.control_provider == AgentProvider.OPENAI_AGENTS_SDK
        assert config.treatment_percentage == 30.0


class TestUnifiedOrchestrator:
    """Test UnifiedAgentOrchestrator functionality"""
    
    @patch.dict('os.environ', {})
    def test_orchestrator_initialization_no_keys(self):
        """Orchestrator should initialize even without API keys"""
        orchestrator = UnifiedAgentOrchestrator()
        assert orchestrator.default_provider == AgentProvider.OPENAI_AGENTS_SDK
        assert len(orchestrator.providers) == 0  # No providers without keys
    
    @patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'})
    def test_orchestrator_with_openai_key(self):
        """Orchestrator should register OpenAI provider when key is present"""
        orchestrator = UnifiedAgentOrchestrator()
        assert AgentProvider.OPENAI_AGENTS_SDK in orchestrator.providers
    
    @patch.dict('os.environ', {})
    def test_ab_test_configuration(self):
        """Test A/B test configuration"""
        orchestrator = UnifiedAgentOrchestrator()
        orchestrator.configure_ab_test(
            name="test_ab",
            control_provider=AgentProvider.OPENAI_AGENTS_SDK,
            treatment_provider=AgentProvider.GEMINI_ADK,
            treatment_percentage=50.0
        )
        assert "test_ab" in orchestrator.ab_tests
        assert orchestrator.ab_tests["test_ab"].treatment_percentage == 50.0
    
    @patch.dict('os.environ', {})
    def test_disable_ab_test(self):
        """Test disabling an A/B test"""
        orchestrator = UnifiedAgentOrchestrator()
        orchestrator.configure_ab_test(
            name="test_ab",
            control_provider=AgentProvider.OPENAI_AGENTS_SDK,
            treatment_provider=AgentProvider.GEMINI_ADK
        )
        orchestrator.disable_ab_test("test_ab")
        assert orchestrator.ab_tests["test_ab"].is_active is False
    
    @patch.dict('os.environ', {})
    def test_get_metrics_summary_empty(self):
        """Test metrics summary with no data"""
        orchestrator = UnifiedAgentOrchestrator()
        summary = orchestrator.get_metrics_summary()
        assert summary["count"] == 0
        assert summary["success_rate"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

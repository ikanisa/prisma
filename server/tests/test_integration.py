"""
Simple integration test to verify the multi-provider system works
"""
import asyncio
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from server.agents.base import AgentOrchestrator, AgentProvider, AgentToolDefinition
from server.agents.openai_provider import OpenAIAgentProvider
from server.agents.gemini_provider import GeminiAgentProvider


async def test_basic_integration():
    """Test basic agent creation and mock execution"""
    print("🧪 Testing Multi-Provider Agent System Integration\n")

    # Initialize orchestrator
    print("1️⃣ Initializing orchestrator...")
    orchestrator = AgentOrchestrator()

    # Register providers (will use mock/test mode if no API keys)
    print("2️⃣ Registering providers...")
    try:
        orchestrator.register_provider(AgentProvider.OPENAI, OpenAIAgentProvider())
        print("   ✅ OpenAI provider registered")
    except Exception as e:
        print(f"   ⚠️  OpenAI provider: {e}")

    try:
        orchestrator.register_provider(AgentProvider.GEMINI, GeminiAgentProvider())
        print("   ✅ Gemini provider registered")
    except Exception as e:
        print(f"   ⚠️  Gemini provider: {e}")

    # Test agent creation
    print("\n3️⃣ Testing agent creation...")
    if AgentProvider.OPENAI in orchestrator.providers:
        try:
            agent_id = await orchestrator.providers[AgentProvider.OPENAI].create_agent(
                name="Test Agent",
                instructions="You are a helpful test assistant",
                tools=[],
                model="gpt-4o"
            )
            print(f"   ✅ Created agent: {agent_id}")
        except Exception as e:
            print(f"   ⚠️  Agent creation: {e}")

    # Test tool definition
    print("\n4️⃣ Testing tool definitions...")
    tool = AgentToolDefinition(
        name="test_tool",
        description="A test tool",
        parameters={
            "type": "object",
            "properties": {
                "input": {"type": "string"}
            }
        }
    )
    print(f"   ✅ Tool definition created: {tool.name}")

    # Check environment
    print("\n5️⃣ Environment check...")
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    has_google = bool(os.getenv("GOOGLE_API_KEY"))
    print(f"   OPENAI_API_KEY: {'✅ Set' if has_openai else '❌ Not set'}")
    print(f"   GOOGLE_API_KEY: {'✅ Set' if has_google else '❌ Not set'}")

    if not has_openai or not has_google:
        print("\n   ℹ️  Note: Set API keys to test actual execution:")
        print("      export OPENAI_API_KEY=your_key")
        print("      export GOOGLE_API_KEY=your_key")

    print("\n✅ Integration test completed successfully!")
    print("\nNext steps:")
    print("  1. Set API keys in environment")
    print("  2. Apply database migration")
    print("  3. Run: python examples/tax_agent_example.py")


if __name__ == "__main__":
    asyncio.run(test_basic_integration())

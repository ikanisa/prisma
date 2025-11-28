"""
Example: Tax Agent with Google Maps Integration
"""
import asyncio
from server.agents.base import AgentOrchestrator, AgentProvider, AgentToolDefinition
from server.agents.openai_provider import OpenAIAgentProvider
from server.agents.gemini_provider import GeminiAgentProvider
from server.integrations.google_maps import GoogleMapsService


async def main():
    # Initialize services
    orchestrator = AgentOrchestrator()
    orchestrator.register_provider(AgentProvider.OPENAI, OpenAIAgentProvider())
    orchestrator.register_provider(AgentProvider.GEMINI, GeminiAgentProvider())

    maps_service = GoogleMapsService()

    # Define tools
    tools = [
        AgentToolDefinition(
            name="search_tax_offices",
            description="Search for tax offices near a location",
            parameters={
                "type": "object",
                "properties": {
                    "location": {
                        "type": "object",
                        "properties": {
                            "lat": {"type": "number"},
                            "lng": {"type": "number"}
                        }
                    },
                    "radius": {"type": "integer", "default": 5000}
                },
                "required": ["location"]
            },
            handler=lambda location, radius=5000: maps_service.search_places(
                query="tax office",
                location=location,
                radius=radius
            )
        ),
        AgentToolDefinition(
            name="get_directions_to_office",
            description="Get directions to a tax office",
            parameters={
                "type": "object",
                "properties": {
                    "origin": {"type": "string"},
                    "destination": {"type": "string"},
                    "mode": {"type": "string", "enum": ["driving", "walking", "transit"]}
                },
                "required": ["origin", "destination"]
            },
            handler=lambda origin, destination, mode="driving": maps_service.get_directions(
                origin=origin,
                destination=destination,
                mode=mode
            )
        )
    ]

    # Create agent with OpenAI
    agent_id = await orchestrator.providers[AgentProvider.OPENAI].create_agent(
        name="Tax Office Locator",
        instructions="""You are a helpful assistant that helps users find tax offices
        and get directions. Use the available tools to search for offices and provide
        directions. Always be specific about locations and provide clear instructions.""",
        tools=tools,
        model="gpt-4o"
    )

    # Example 1: Find tax offices
    print("Example 1: Finding tax offices near Times Square")
    print("-" * 50)

    response = await orchestrator.execute(
        agent_id=agent_id,
        input_text="Find tax offices near Times Square, New York",
        provider=AgentProvider.OPENAI
    )

    print(response.content)
    print(f"\nTokens used: {response.usage['total_tokens']}")

    # Example 2: Get directions
    print("\n\nExample 2: Getting directions")
    print("-" * 50)

    response = await orchestrator.execute(
        agent_id=agent_id,
        input_text="How do I get to the nearest tax office from Central Park by walking?",
        provider=AgentProvider.OPENAI
    )

    print(response.content)

    # Example 3: Use Gemini with grounding for tax questions
    print("\n\nExample 3: Tax question with Gemini grounding")
    print("-" * 50)

    gemini = orchestrator.providers[AgentProvider.GEMINI]
    tax_agent_id = await gemini.create_agent(
        name="Tax Advisor",
        instructions="You are a tax advisor with access to current tax information.",
        tools=[],
        model="gemini-2.0-flash-exp"
    )

    response = await gemini.run_with_grounding(
        agent_id=tax_agent_id,
        input_text="What are the current corporate tax rates in the United States?",
        enable_search=True
    )

    print(response.content)

    if response.metadata.get('grounded'):
        print("\nSources:")
        for chunk in response.metadata['grounding_metadata']['grounding_chunks']:
            if chunk.get('web'):
                print(f"- {chunk['web'].get('title', 'N/A')}")


if __name__ == "__main__":
    asyncio.run(main())

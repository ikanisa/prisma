# Multi-Provider AI Agent System

A unified abstraction layer for working with multiple AI providers (OpenAI, Gemini) in the Prisma Glow platform.

## Quick Start

### Installation

```bash
# Python dependencies
pip install -r server/requirements-ai.txt

# Node.js dependencies
pnpm install
```

### Environment Setup

```bash
export GOOGLE_API_KEY=your_google_api_key
export OPENAI_API_KEY=your_openai_api_key
export GOOGLE_MAPS_API_KEY=your_maps_api_key  # Optional, defaults to GOOGLE_API_KEY
```

### Database Migration

```bash
psql "$DATABASE_URL" -f migrations/20251128160804_multi_provider_agents.sql
```

## Usage

### Python

```python
from server.agents.base import AgentOrchestrator, AgentProvider
from server.agents.openai_provider import OpenAIAgentProvider
from server.agents.gemini_provider import GeminiAgentProvider

# Initialize
orchestrator = AgentOrchestrator()
orchestrator.register_provider(AgentProvider.OPENAI, OpenAIAgentProvider())
orchestrator.register_provider(AgentProvider.GEMINI, GeminiAgentProvider())

# Create agent
agent_id = await orchestrator.providers[AgentProvider.OPENAI].create_agent(
    name="Assistant",
    instructions="You are helpful",
    tools=[],
    model="gpt-4o"
)

# Execute with fallback
response = await orchestrator.execute(
    agent_id=agent_id,
    input_text="Hello!",
    fallback_providers=[AgentProvider.GEMINI]
)
```

### TypeScript

```typescript
import { createAgentGateway, AgentProvider } from './services/rag/agents/unified-gateway.js';

const gateway = createAgentGateway({
  defaultProvider: AgentProvider.OPENAI,
  fallbackProviders: [AgentProvider.GEMINI]
});

const response = await gateway.execute({
  agentId: 'agent_1',
  input: 'Your query here'
});
```

## Features

- ✅ **Multi-Provider Support** - OpenAI and Gemini with unified interface
- ✅ **Automatic Fallback** - Seamless provider switching on errors
- ✅ **Streaming** - Real-time response streaming
- ✅ **Google Search Grounding** - Gemini with real-time web search
- ✅ **Google Maps Integration** - Location-based agent tools
- ✅ **Image Generation** - Imagen + DALL-E with fallback
- ✅ **Tool Orchestration** - Function calling and tool execution
- ✅ **TypeScript Gateway** - Frontend integration layer

## Documentation

- **[Usage Guide](file:///Users/jeanbosco/workspace/prisma/docs/AI_AGENT_USAGE_GUIDE.md)** - Comprehensive usage examples
- **[Example Code](file:///Users/jeanbosco/workspace/prisma/examples/tax_agent_example.py)** - Working example
- **[Walkthrough](file:///Users/jeanbosco/.gemini/antigravity/brain/f847c0b8-c93a-4caa-92f8-e6704a54239d/walkthrough.md)** - Implementation details

## Testing

```bash
# Run all tests
pytest server/tests/agents/ server/tests/integrations/ -v

# Run specific provider tests
pytest server/tests/agents/test_openai_provider.py -v
pytest server/tests/agents/test_gemini_provider.py -v
```

## API Endpoints

### Create Agent
`POST /agents/v2/create`

### Execute Agent
`POST /agents/v2/execute`

### Stream Agent
`POST /agents/v2/stream`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  TypeScript Gateway                      │
│              (Unified Agent Interface)                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Python Agent Orchestrator                   │
│           (Provider Abstraction Layer)                   │
└────────┬────────────────────────────┬───────────────────┘
         │                            │
         ▼                            ▼
┌────────────────┐          ┌────────────────┐
│ OpenAI Provider│          │ Gemini Provider│
│  - GPT-4o      │          │  - Flash 2.0   │
│  - Streaming   │          │  - Grounding   │
│  - Tools       │          │  - Streaming   │
└────────────────┘          └────────────────┘
```

## Next Steps

1. Configure API keys in environment
2. Apply database migration
3. Run tests to verify setup
4. Try the example code
5. Integrate with existing agents

## Support

For issues or questions, see the [Usage Guide](file:///Users/jeanbosco/workspace/prisma/docs/AI_AGENT_USAGE_GUIDE.md).

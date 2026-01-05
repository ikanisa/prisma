# OpenAI Reference Repositories

This document summarizes key learnings from the OpenAI reference repositories cloned to `~/workspace`.

## Repositories

1. **openai-chatkit-starter-app** - Basic ChatKit integration
2. **openai-chatkit-advanced-samples** - Advanced ChatKit patterns
3. **openai-agents-python** - Agent orchestration examples

## Key Patterns and Learnings

### 1. ChatKit Starter App

**Location**: `~/workspace/openai-chatkit-starter-app`

**Key Features:**
- Minimal ChatKit integration
- Session management
- Basic widget rendering
- OAuth flow

**Patterns to Adopt:**
```typescript
// Session creation pattern
const session = await createSession({
  agentSessionId: 'unique-id',
  metadata: { userId, orgId },
});

// Widget rendering
<ChatKit
  sessionId={session.id}
  onWidgetAction={handleWidgetAction}
/>
```

**Integration Points:**
- Use for basic ChatKit setup
- Reference for OAuth implementation
- Widget action handling

### 2. ChatKit Advanced Samples

**Location**: `~/workspace/openai-chatkit-advanced-samples`

**Key Features:**
- FastAPI backend integration
- Streaming responses
- Complex widget patterns
- Multi-agent orchestration

**Patterns to Adopt:**
```python
# FastAPI streaming pattern
@app.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    async def generate():
        async for chunk in agent.stream(request.message):
            yield f"data: {json.dumps(chunk)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

**Widget Patterns:**
- Form widgets with validation
- Table widgets with sorting
- Chart widgets with data
- Approval workflows

**Integration Points:**
- Backend streaming implementation
- Complex widget creation
- Multi-step workflows

### 3. Agents Python

**Location**: `~/workspace/openai-agents-python`

**Key Features:**
- Agent orchestration
- Tool calling patterns
- Workflow management
- Error handling

**Patterns to Adopt:**
```python
# Agent orchestration
from openai import OpenAI

client = OpenAI()

# Create agent
agent = client.beta.agents.create(
    name="Audit Agent",
    instructions="You are an audit specialist...",
    tools=[tool1, tool2],
    model="gpt-4o"
)

# Run agent
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=agent.id
)
```

**Tool Patterns:**
- Tool definition with JSON schema
- Tool execution with validation
- Tool result formatting
- Error handling

**Integration Points:**
- Agent creation patterns
- Tool calling best practices
- Workflow orchestration
- Error recovery

## Implementation Recommendations

### For Prisma Glow

1. **ChatKit Integration**
   - Use starter app for basic setup
   - Adopt advanced patterns for complex widgets
   - Implement streaming from advanced samples

2. **Agent Orchestration**
   - Use agents-python patterns for workflow
   - Implement tool calling from examples
   - Adopt error handling patterns

3. **Backend Integration**
   - Reference FastAPI patterns from advanced samples
   - Implement streaming responses
   - Use session management patterns

## Code Snippets to Reference

### ChatKit Session Management

```typescript
// From starter app
const createSession = async (agentSessionId: string) => {
  const response = await fetch('/api/chatkit/session', {
    method: 'POST',
    body: JSON.stringify({ agentSessionId }),
  });
  return response.json();
};
```

### Widget Action Handling

```typescript
// From starter app
const handleWidgetAction = (action: WidgetAction) => {
  if (action.type === 'callback') {
    // Execute callback
    executeTool(action.callback, action.data);
  }
};
```

### Streaming Responses

```python
# From advanced samples
async def stream_response(message: str):
    async for chunk in agent.stream(message):
        yield {
            "type": "text",
            "content": chunk
        }
```

### Tool Definition

```python
# From agents-python
tool = {
    "type": "function",
    "function": {
        "name": "create_engagement",
        "description": "Create a new engagement",
        "parameters": {
            "type": "object",
            "properties": {
                "client_id": {"type": "string"},
                "type": {"type": "string"},
            },
            "required": ["client_id", "type"],
        },
    },
}
```

## Migration Path

### Phase 1: Basic Integration
- Use starter app patterns for ChatKit setup
- Implement basic session management
- Add simple widgets

### Phase 2: Advanced Features
- Adopt streaming from advanced samples
- Implement complex widgets
- Add multi-agent support

### Phase 3: Production
- Use agents-python for orchestration
- Implement error handling
- Add monitoring and observability

## Testing Patterns

### From Starter App
```typescript
// Test session creation
test('creates session', async () => {
  const session = await createSession('test-id');
  expect(session.id).toBeDefined();
});
```

### From Advanced Samples
```python
# Test streaming
async def test_streaming():
    async for chunk in stream_response("test"):
        assert chunk["type"] == "text"
```

## Documentation References

- ChatKit Docs: https://platform.openai.com/docs/guides/chatkit
- Agents SDK: https://platform.openai.com/docs/guides/agents
- Apps SDK: https://platform.openai.com/docs/guides/apps

## Next Steps

1. Review each repository in detail
2. Identify patterns to adopt
3. Create migration plan
4. Implement patterns in Prisma Glow
5. Test integration
6. Deploy to production


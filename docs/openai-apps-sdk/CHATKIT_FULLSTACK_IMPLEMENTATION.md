# Fullstack ChatKit, Agent SDK, and Widgets Implementation

This document describes the complete fullstack implementation of OpenAI ChatKit, Agent SDK integration, and Widget system.

## Overview

The implementation provides:
- ✅ **ChatKit Session Management** - API routes for session creation and management
- ✅ **ChatKit Message Handling** - Full message flow with streaming support
- ✅ **Widget System** - Complete widget rendering (button, text, image, file, form, card, table, chart)
- ✅ **React Hooks** - `useChatKit` hook for easy integration
- ✅ **React Components** - `ChatKitInterface` and `WidgetRenderer` components
- ✅ **Agent SDK Integration** - Seamless integration with existing agent system
- ✅ **Streaming Support** - Real-time message streaming
- ✅ **Error Handling** - Comprehensive error handling and loading states

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
├─────────────────────────────────────────────────────────────┤
│  ChatKitInterface Component                                  │
│  ├── useChatKit Hook                                        │
│  ├── MessageBubble Component                                │
│  └── WidgetRenderer Component                               │
│      ├── ButtonWidget                                       │
│      ├── TextWidget                                         │
│      ├── ImageWidget                                        │
│      ├── FileWidget                                         │
│      ├── FormWidget                                         │
│      ├── CardWidget                                         │
│      ├── TableWidget                                        │
│      └── ChartWidget                                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/SSE
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              API Routes (Next.js App Router)                 │
├─────────────────────────────────────────────────────────────┤
│  /api/chatkit/session                                        │
│  ├── POST - Create session                                  │
│  └── GET - Load session                                     │
│                                                              │
│  /api/chatkit/message                                        │
│  └── POST - Send message (streaming/non-streaming)          │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────────┐
│            Backend Services (Gateway/RAG Service)            │
├─────────────────────────────────────────────────────────────┤
│  /api/agent/chatkit/session                                  │
│  /api/agent/respond                                          │
│  /api/agent/stream                                           │
│  (Existing agent endpoints)                                  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. API Routes

#### `/api/chatkit/session`

**POST** - Create a new ChatKit session
```typescript
// Request
{
  agentSessionId: string;
  chatkitSessionId: string;
  metadata?: Record<string, unknown>;
}

// Response
{
  session: {
    id: string;
    agentSessionId: string;
    status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
    metadata?: Record<string, unknown>;
    createdAt: Date;
  }
}
```

**GET** - Load an existing session
```typescript
// Query: ?id=<sessionId>

// Response
{
  session: { ... }
}
```

#### `/api/chatkit/message`

**POST** - Send a message and get response
```typescript
// Request
{
  sessionId: string;
  message: string;
  agentType?: string;
  orgSlug?: string;
  context?: Record<string, unknown>;
  stream?: boolean;
}

// Response (non-streaming)
{
  response: {
    output: string;
    widgets?: Widget[];
    metadata?: Record<string, unknown>;
  }
}

// Response (streaming)
// Server-Sent Events (SSE) stream
```

### 2. React Hook: `useChatKit`

```typescript
const {
  messages,        // Array of ChatKitMessage
  session,         // Current session or null
  isLoading,       // Loading state
  isStreaming,     // Streaming state
  error,           // Error state
  sendMessage,     // Function to send message
  createSession,   // Function to create session
  loadSession,     // Function to load session
  cancelSession,   // Function to cancel session
  clearMessages,   // Function to clear messages
} = useChatKit({
  sessionId?: string;
  agentType?: string;
  orgSlug?: string;
  stream?: boolean;
  onMessage?: (message: ChatKitMessage) => void;
  onError?: (error: Error) => void;
});
```

### 3. React Components

#### `ChatKitInterface`

Main interface component for ChatKit interactions.

```tsx
<ChatKitInterface
  agentSessionId="agent_session_123"
  agentType="tax-agent"
  orgSlug="my-org"
  stream={true}
  onSessionCreate={(sessionId) => console.log('Session created:', sessionId)}
  onWidgetAction={(widgetId, action) => console.log('Widget action:', widgetId, action)}
/>
```

**Props:**
- `agentSessionId` (required) - Agent session ID
- `agentType` (optional) - Agent type identifier
- `orgSlug` (optional) - Organization slug
- `stream` (optional) - Enable streaming (default: false)
- `onSessionCreate` (optional) - Callback when session is created
- `onWidgetAction` (optional) - Callback for widget actions

#### `WidgetRenderer`

Renders widgets based on widget type.

```tsx
<WidgetRenderer
  widget={widget}
  onAction={(action) => {
    // Handle widget action
  }}
/>
```

**Supported Widget Types:**
- `button` - Interactive button with actions
- `text` - Text content (plain, markdown, HTML)
- `image` - Image display
- `file` - File download
- `form` - Form with fields
- `card` - Card container with content
- `table` - Data table
- `chart` - Chart visualization (placeholder)

### 4. Widget System

#### Creating Widgets

```typescript
import {
  createButtonWidget,
  createTextWidget,
  createFormWidget,
  createCardWidget,
} from '@prisma/lib/openai/chatkit';

// Button widget
const buttonWidget = createButtonWidget({
  label: 'Submit',
  variant: 'primary',
  actions: [{
    type: 'submit',
    callback: 'handleSubmit',
    data: { formId: '123' },
  }],
});

// Text widget with markdown
const textWidget = createTextWidget({
  content: '# Hello World\n\nThis is **bold** text.',
  format: 'markdown',
});

// Form widget
const formWidget = createFormWidget({
  title: 'Contact Form',
  fields: [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'your@email.com',
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
    },
  ],
  submitLabel: 'Send',
});

// Card widget
const cardWidget = createCardWidget({
  header: 'Document Review',
  content: [textWidget, buttonWidget],
  footer: 'Last updated: 2024-01-01',
});
```

#### Widget Validation

```typescript
import { validateWidget } from '@prisma/lib/openai/chatkit';

const validation = validateWidget(widget);
if (!validation.valid) {
  console.error('Widget errors:', validation.errors);
}
```

## Usage Examples

### Basic Usage

```tsx
'use client';

import { ChatKitInterface } from '@/components/features/chatkit';

export default function ChatPage() {
  return (
    <div className="h-screen">
      <ChatKitInterface
        agentSessionId="agent_123"
        agentType="tax-agent"
        orgSlug="my-org"
        stream={true}
      />
    </div>
  );
}
```

### Advanced Usage with Custom Handlers

```tsx
'use client';

import { ChatKitInterface } from '@/components/features/chatkit';
import { useRouter } from 'next/navigation';

export default function AdvancedChatPage() {
  const router = useRouter();

  const handleWidgetAction = (widgetId: string, action: any) => {
    if (action.type === 'navigate' && action.url) {
      router.push(action.url);
    } else if (action.type === 'submit') {
      // Handle form submission
      console.log('Form data:', action.data);
      // Send to API, update state, etc.
    }
  };

  return (
    <div className="h-screen">
      <ChatKitInterface
        agentSessionId="agent_123"
        agentType="tax-agent"
        orgSlug="my-org"
        stream={true}
        onSessionCreate={(sessionId) => {
          console.log('New session:', sessionId);
        }}
        onWidgetAction={handleWidgetAction}
      />
    </div>
  );
}
```

### Using the Hook Directly

```tsx
'use client';

import { useChatKit } from '@/hooks/use-chatkit';
import { WidgetRenderer } from '@/components/features/chatkit';
import { Button } from '@/components/ui/button';

export default function CustomChatPage() {
  const {
    messages,
    session,
    isLoading,
    sendMessage,
    createSession,
  } = useChatKit({
    agentType: 'tax-agent',
    orgSlug: 'my-org',
    stream: true,
  });

  useEffect(() => {
    createSession('agent_session_123');
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id}>
            <div>{message.role}: {message.content}</div>
            {message.widgets?.map((widget, i) => (
              <WidgetRenderer key={i} widget={widget} />
            ))}
          </div>
        ))}
      </div>
      <div className="border-t p-4">
        <Button
          onClick={() => sendMessage('Hello!')}
          disabled={isLoading}
        >
          Send Message
        </Button>
      </div>
    </div>
  );
}
```

## Integration with Agent SDK

The ChatKit implementation integrates seamlessly with the existing agent system:

1. **Session Linking**: ChatKit sessions are linked to agent sessions
2. **Agent Routing**: Messages are routed to appropriate agents
3. **Tool Execution**: Agent tools can generate widgets
4. **Response Formatting**: Agent responses include widgets when applicable

### Example: Agent Response with Widgets

```typescript
// Backend agent response
{
  output: "Here's a summary of your tax documents:",
  widgets: [
    createCardWidget({
      header: "Tax Documents",
      content: [
        createTableWidget({
          headers: ["Document", "Status", "Action"],
          rows: [
            ["W-2", "Processed", "View"],
            ["1099", "Pending", "Review"],
          ],
        }),
        createButtonWidget({
          label: "Download All",
          variant: "primary",
          actions: [{
            type: "callback",
            callback: "downloadAll",
          }],
        }),
      ],
    }),
  ],
}
```

## File Structure

```
apps/web/
  app/
    api/
      chatkit/
        session/
          route.ts          # Session management API
        message/
          route.ts          # Message API
  components/
    features/
      chatkit/
        ChatKitInterface.tsx    # Main ChatKit component
        WidgetRenderer.tsx       # Widget rendering component
        index.ts                 # Exports
  hooks/
    use-chatkit.ts              # ChatKit React hook

packages/lib/src/
  openai/
    chatkit/
      widgets.ts                # Widget types and utilities
      index.ts                  # Exports
```

## Dependencies

### Required

- `react` - React library
- `next` - Next.js framework
- `@supabase/ssr` - Supabase server-side rendering
- `@prisma/lib` - Internal library with widget types

### Optional (for enhanced features)

- `react-markdown` - For markdown rendering in text widgets
- `recharts` or `chart.js` - For chart widget rendering

## Configuration

### Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Optional (if using backend services)
NEXT_PUBLIC_API_URL=http://localhost:8000
API_BASE_URL=http://localhost:8000
```

## Testing

### Unit Tests

Test individual components and hooks:

```typescript
import { render, screen } from '@testing-library/react';
import { ChatKitInterface } from '@/components/features/chatkit';

test('ChatKitInterface renders correctly', () => {
  render(<ChatKitInterface agentSessionId="test" />);
  // Assertions
});
```

### Integration Tests

Test the full flow:

```typescript
import { useChatKit } from '@/hooks/use-chatkit';

test('useChatKit creates session and sends message', async () => {
  const { createSession, sendMessage } = useChatKit();
  await createSession('agent_123');
  await sendMessage('Hello');
  // Assertions
});
```

## Best Practices

1. **Error Handling**: Always handle errors from `useChatKit` hook
2. **Loading States**: Show loading indicators during async operations
3. **Widget Actions**: Implement proper handlers for widget actions
4. **Session Management**: Clean up sessions when component unmounts
5. **Streaming**: Use streaming for better UX with long responses
6. **Widget Validation**: Validate widgets before rendering
7. **Accessibility**: Ensure widgets are accessible (keyboard navigation, screen readers)

## Troubleshooting

### Session Creation Fails

- Verify `agentSessionId` is valid
- Check backend service is running
- Verify authentication tokens

### Widgets Not Rendering

- Check widget structure matches specification
- Validate widgets using `validateWidget()`
- Check browser console for errors

### Streaming Not Working

- Verify `stream={true}` prop is set
- Check backend supports streaming
- Verify SSE connection is established

## Future Enhancements

- [ ] Real-time collaboration (multiple users)
- [ ] Widget state persistence
- [ ] Custom widget types
- [ ] Widget themes and styling
- [ ] Chart widget full implementation
- [ ] Audio/video widgets
- [ ] Widget animations
- [ ] Widget drag-and-drop builder

## References

- [OpenAI ChatKit Documentation](https://platform.openai.com/docs/guides/chatkit-widgets)
- [Widget Types Specification](./README.md#widget-types)
- [Agent SDK Integration](./IMPLEMENTATION_SUMMARY.md)

# OpenAI Apps SDK Quick Start Guide

This guide will help you quickly get started with OpenAI Apps SDK integration in Prisma Glow.

## Prerequisites

- Node.js 18+ installed
- OpenAI API key
- OpenAI OAuth credentials (for app store deployment)

## Installation

The OpenAI Apps SDK integration is already included in Prisma Glow. No additional installation is required.

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# OpenAI OAuth (required for app store deployment)
OPENAI_APP_OAUTH_CLIENT_ID=your_client_id
OPENAI_APP_OAUTH_CLIENT_SECRET=your_client_secret

# OpenAI API
OPENAI_API_KEY=your_api_key

# App URL
NEXT_PUBLIC_APP_URL=https://prisma-glow.pages.dev

# Optional features
OPENAI_REALTIME_ENABLED=true
OPENAI_STREAMING_ENABLED=true
OPENAI_FILE_SEARCH_VECTOR_STORE_ID=vs_abc123
```

### 2. Verify Configuration File

Ensure `apps/web/public/.well-known/openai-app-config.json` is accessible at:
```
https://your-domain.com/.well-known/openai-app-config.json
```

## Quick Examples

### Using ChatKit

```typescript
import { ChatKitInterface } from '@/components/features/chatkit/ChatKitInterface';

function MyPage() {
  return (
    <ChatKitInterface
      agentSessionId="session-123"
      agentType="tax"
      orgSlug="my-org"
      stream={true}
      onWidgetAction={(widgetId, action) => {
        console.log('Widget action:', widgetId, action);
      }}
    />
  );
}
```

### Creating Widgets

```typescript
import {
  createButtonWidget,
  createFormWidget,
  createChartWidget,
} from '@prisma/lib/openai/chatkit';

// Button widget
const button = createButtonWidget({
  label: 'Calculate Tax',
  variant: 'primary',
  actions: [
    {
      type: 'callback',
      callback: 'calculate_tax',
      data: { amount: 1000 },
    },
  ],
});

// Form widget
const form = createFormWidget({
  title: 'Tax Form',
  fields: [
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      required: true,
    },
  ],
});
```

### Using Agent Builder

```typescript
import {
  createWorkflow,
  validateWorkflow,
  exportWorkflow,
} from '@prisma/lib/openai/agent-builder';

// Create workflow
const workflow = createWorkflow(
  'Tax Workflow',
  'Calculate tax',
  [
    {
      id: 'input-1',
      type: 'input',
      label: 'Amount',
      position: { x: 0, y: 0 },
      config: {},
    },
  ],
  []
);

// Validate
const validation = validateWorkflow(workflow);

// Export
const exported = exportWorkflow(workflow, 'python');
```

### Using MCP Server

```typescript
import { MCPServer, createPrismaGlowMCPServer } from '@prisma/lib/openai/mcp-server';

const server = new MCPServer(createPrismaGlowMCPServer());

// Handle request
const response = await server.handleRequest({
  method: 'tools/call',
  params: {
    name: 'file_search',
    arguments: {
      query: 'tax calculation',
    },
  },
});
```

## Testing

### Test OAuth Flow

1. Navigate to `/auth/openai`
2. Complete OAuth flow
3. Verify tokens are stored

### Test ChatKit

1. Create a ChatKit session
2. Send a message
3. Verify response with widgets

### Test Agent Builder

1. Create a workflow
2. Validate it
3. Export to different formats

### Test MCP Server

1. Call `GET /api/mcp` to get capabilities
2. Call `POST /api/mcp` with a tool request
3. Verify response

## Next Steps

- Read the [Comprehensive Implementation Guide](./COMPREHENSIVE_IMPLEMENTATION_GUIDE.md)
- Review [Implementation Summary](./IMPLEMENTATION_SUMMARY_2025.md)
- Check [OpenAI Documentation](https://developers.openai.com/apps-sdk)

## Troubleshooting

### OAuth Not Working

- Verify `OPENAI_APP_OAUTH_CLIENT_ID` and `OPENAI_APP_OAUTH_CLIENT_SECRET` are set
- Check redirect URI matches OpenAI app configuration
- Verify callback route is accessible

### Widgets Not Rendering

- Check widget type is supported
- Verify widget data structure
- Check browser console for errors

### MCP Server Errors

- Verify tool handlers are registered
- Check tool input schema matches
- Verify API endpoint is accessible

## Support

For issues or questions:
- Check documentation in `docs/openai-apps-sdk/`
- Review OpenAI Apps SDK documentation
- Contact support at support@prisma-glow.com

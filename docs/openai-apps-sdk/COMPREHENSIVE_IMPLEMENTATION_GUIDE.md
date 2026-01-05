# Comprehensive OpenAI Apps SDK Implementation Guide

This document provides a comprehensive guide to all OpenAI Apps SDK features implemented in Prisma Glow, including Agent Builder, ChatKit, Widgets, MCP Server, and deployment readiness.

## Table of Contents

1. [Overview](#overview)
2. [Agent Builder](#agent-builder)
3. [ChatKit Integration](#chatkit-integration)
4. [Widget System](#widget-system)
5. [MCP Server](#mcp-server)
6. [OAuth Authentication](#oauth-authentication)
7. [State Management](#state-management)
8. [File Search Integration](#file-search-integration)
9. [Deployment Checklist](#deployment-checklist)
10. [Best Practices](#best-practices)

## Overview

Prisma Glow is fully integrated with OpenAI Apps SDK, providing:

- ✅ **Agent Builder** - Visual workflow creation and export
- ✅ **ChatKit** - Full-featured chat interface with widget support
- ✅ **Widget System** - 15+ widget types for rich interactions
- ✅ **MCP Server** - Model Context Protocol integration
- ✅ **OAuth Authentication** - Secure user authentication
- ✅ **File Search** - Knowledge base integration
- ✅ **Web Search** - Real-time information retrieval
- ✅ **Realtime API** - Voice and real-time interactions
- ✅ **Streaming** - Server-sent events for real-time updates

## Agent Builder

### Overview

Agent Builder allows you to create, validate, and export multi-step agent workflows visually.

### Features

- **Workflow Creation**: Create workflows with nodes and connections
- **Validation**: Comprehensive workflow validation
- **Export**: Export to JSON, YAML, Python, or TypeScript
- **Templates**: Pre-built workflow templates
- **Preview**: Test workflows before deployment

### Usage

```typescript
import { createWorkflow, validateWorkflow, exportWorkflow } from '@prisma/lib/openai/agent-builder';

// Create a workflow
const workflow = createWorkflow(
  'Tax Calculation Workflow',
  'Calculate tax for multiple jurisdictions',
  [
    {
      id: 'input-1',
      type: 'input',
      label: 'Amount Input',
      position: { x: 0, y: 0 },
      config: {},
    },
    {
      id: 'agent-1',
      type: 'agent',
      label: 'Tax Agent',
      position: { x: 200, y: 0 },
      config: { agentId: 'tax-corp-rw-027' },
    },
  ],
  [
    {
      id: 'conn-1',
      source: 'input-1',
      target: 'agent-1',
    },
  ]
);

// Validate workflow
const validation = validateWorkflow(workflow);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

// Export workflow
const exported = exportWorkflow(workflow, 'python');
```

### API Endpoints

- `POST /api/agent/builder` - Create, validate, or export workflows
- `GET /api/agent/builder?action=templates` - Get workflow templates

## ChatKit Integration

### Overview

ChatKit provides a full-featured chat interface with widget support, session management, and streaming capabilities.

### Features

- **Session Management**: Create, resume, and cancel sessions
- **Message Handling**: Send and receive messages with widgets
- **Streaming**: Real-time message streaming
- **Widget Support**: Rich interactive widgets
- **Error Handling**: Comprehensive error handling

### Usage

```typescript
import { ChatKitInterface } from '@/components/features/chatkit/ChatKitInterface';

<ChatKitInterface
  agentSessionId="session-123"
  agentType="tax"
  orgSlug="my-org"
  stream={true}
  onSessionCreate={(sessionId) => console.log('Session created:', sessionId)}
  onWidgetAction={(widgetId, action) => {
    console.log('Widget action:', widgetId, action);
  }}
/>
```

### API Endpoints

- `POST /api/agent/chatkit/session` - Create or resume a ChatKit session
- `POST /api/agent/chatkit/session/:id/cancel` - Cancel a session
- `POST /api/agent/chatkit/message` - Send a message
- `POST /api/agent/realtime/session` - Create a realtime session

## Widget System

### Supported Widget Types

1. **Button** - Interactive buttons with actions
2. **Text** - Plain text, markdown, or HTML
3. **Image** - Image display
4. **File** - File download
5. **Form** - Form inputs with validation
6. **Card** - Container for other widgets
7. **Table** - Data tables
8. **Chart** - Data visualization (line, bar, pie, etc.)
9. **List** - Item lists with selection
10. **Accordion** - Collapsible content sections
11. **Calendar** - Date picker
12. **Map** - Geographic maps
13. **Video** - Video player
14. **Audio** - Audio player
15. **Code** - Code display with syntax highlighting

### Usage

```typescript
import {
  createButtonWidget,
  createFormWidget,
  createChartWidget,
} from '@prisma/lib/openai/chatkit';

// Create a button widget
const buttonWidget = createButtonWidget({
  label: 'Calculate Tax',
  variant: 'primary',
  actions: [
    {
      type: 'callback',
      callback: 'calculate_tax',
      data: { amount: 1000, jurisdiction: 'RW' },
    },
  ],
});

// Create a form widget
const formWidget = createFormWidget({
  title: 'Tax Calculation',
  fields: [
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      required: true,
    },
    {
      name: 'jurisdiction',
      label: 'Jurisdiction',
      type: 'select',
      options: [
        { label: 'Rwanda', value: 'RW' },
        { label: 'Malta', value: 'MT' },
      ],
    },
  ],
  actions: [
    {
      type: 'submit',
      callback: 'submit_tax_form',
    },
  ],
});
```

## MCP Server

### Overview

Model Context Protocol (MCP) server provides tools, resources, and prompts for OpenAI agents.

### Available Tools

1. **file_search** - Search files in knowledge base
2. **web_search** - Search the web
3. **calculate_tax** - Calculate tax for amounts
4. **get_audit_guidance** - Get audit guidance

### Usage

```typescript
import { MCPServer, createPrismaGlowMCPServer } from '@prisma/lib/openai/mcp-server';

const server = new MCPServer(createPrismaGlowMCPServer());

// Register custom tool handler
server.registerTool('my_custom_tool', async (args) => {
  // Handle tool execution
  return {
    content: [
      {
        type: 'text',
        text: 'Tool result',
      },
    ],
  };
});

// Handle MCP request
const response = await server.handleRequest({
  method: 'tools/call',
  params: {
    name: 'file_search',
    arguments: {
      query: 'tax calculation',
      maxResults: 10,
    },
  },
});
```

### API Endpoints

- `POST /api/mcp` - Handle MCP requests
- `GET /api/mcp` - Get server capabilities

## OAuth Authentication

### Overview

OAuth 2.0 authentication flow for OpenAI Apps SDK integration.

### Flow

1. User clicks "Connect with OpenAI"
2. Redirect to OpenAI authorization URL
3. User authorizes the app
4. Redirect back with authorization code
5. Exchange code for access token
6. Store tokens securely

### API Endpoints

- `GET /api/auth/openai/callback` - OAuth callback handler
- `POST /api/auth/openai/token` - Exchange code for tokens
- `POST /api/auth/openai/refresh` - Refresh access token

## State Management

### Overview

State management for OpenAI Apps SDK sessions, tokens, and metadata.

### Usage

```typescript
import { getAppsSDKState, setAppsSDKState } from '@prisma/lib/openai/apps-sdk/state';

// Get state
const state = getAppsSDKState();

// Set state
setAppsSDKState({
  sessionId: 'session-123',
  accessToken: 'token-abc',
  metadata: {
    userId: 'user-123',
    orgId: 'org-456',
  },
});
```

## File Search Integration

### Overview

File search integration with OpenAI's file search tool for knowledge base queries.

### Usage

```typescript
import { runOpenAiFileSearch } from '@prisma/lib/openai/file-search';

const results = await runOpenAiFileSearch({
  client: openaiClient,
  query: 'tax calculation Rwanda',
  vectorStoreId: 'vs_abc123',
  topK: 10,
  filters: {
    type: 'eq',
    key: 'jurisdiction',
    value: 'RW',
  },
});
```

## Deployment Checklist

### Pre-Deployment

- [ ] Verify `openai-app-config.json` is accessible at `/.well-known/openai-app-config.json`
- [ ] Test OAuth flow end-to-end
- [ ] Verify all API endpoints are working
- [ ] Test widget rendering
- [ ] Test Agent Builder workflows
- [ ] Test MCP server tools
- [ ] Verify file search integration
- [ ] Test streaming functionality
- [ ] Test realtime sessions
- [ ] Verify error handling

### Configuration

- [ ] Set `OPENAI_APP_OAUTH_CLIENT_ID`
- [ ] Set `OPENAI_APP_OAUTH_CLIENT_SECRET`
- [ ] Set `OPENAI_API_KEY`
- [ ] Set `NEXT_PUBLIC_APP_URL`
- [ ] Configure vector store IDs for file search
- [ ] Set up webhook endpoints (if using)

### Testing

- [ ] Test in iframe context
- [ ] Test mobile responsiveness
- [ ] Test accessibility (WCAG AA)
- [ ] Test keyboard navigation
- [ ] Test screen reader support
- [ ] Load testing
- [ ] Security audit

### Documentation

- [ ] Update README with OpenAI integration
- [ ] Document API endpoints
- [ ] Create user guide
- [ ] Create developer guide
- [ ] Document widget types
- [ ] Document Agent Builder workflows

## Best Practices

### UI/UX

- Keep interfaces simple and intuitive
- Ensure mobile responsiveness
- Follow accessibility guidelines
- Use clear error messages
- Provide loading states
- Implement proper error handling

### Security

- Use HTTPS for all endpoints
- Store tokens securely (httpOnly cookies)
- Validate all inputs
- Implement rate limiting
- Use CSRF protection
- Sanitize user inputs

### Performance

- Implement caching where appropriate
- Use streaming for long responses
- Optimize widget rendering
- Minimize API calls
- Use CDN for static assets

### Error Handling

- Provide clear error messages
- Log errors for debugging
- Implement retry logic
- Handle network failures gracefully
- Provide fallback options

## Resources

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [Agent Builder Guide](https://platform.openai.com/docs/guides/agent-builder)
- [ChatKit Widgets Guide](https://platform.openai.com/docs/guides/chatkit-widgets)
- [MCP Server Guide](https://developers.openai.com/apps-sdk/build/mcp-server)
- [App Submission Guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines)


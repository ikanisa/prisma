# OpenAI Apps SDK Integration

This document describes the OpenAI ChatGPT App Store integration for Prisma Glow.

## Overview

The OpenAI Apps SDK integration enables Prisma Glow to be deployed and used within the OpenAI ChatGPT App Store, providing seamless integration with OpenAI's platform and access to ChatGPT users.

## Features

- ✅ OpenAI Apps SDK configuration
- ✅ OAuth authentication flow
- ✅ State management for app sessions
- ✅ ChatKit widgets support
- ✅ File search integration
- ✅ Metadata optimization for app store submission
- ✅ UI/UX compliance with OpenAI guidelines

## Configuration

### Environment Variables

Add the following environment variables to enable OpenAI Apps SDK integration:

```bash
# Enable OpenAI App integration
NEXT_PUBLIC_OPENAI_APP_ENABLED=true

# OAuth Configuration
OPENAI_APP_OAUTH_CLIENT_ID=your_client_id
OPENAI_APP_OAUTH_CLIENT_SECRET=your_client_secret

# Optional: Custom OAuth endpoint
NEXT_PUBLIC_OPENAI_OAUTH_URL=https://auth.openai.com/oauth/authorize
```

### App Configuration

The app configuration is stored in `public/.well-known/openai-app-config.json`. This file is automatically served at `/.well-known/openai-app-config.json` and is used by OpenAI's platform to discover and configure your app.

Key configuration fields:

- **name**: App name (max 50 characters)
- **description**: App description (max 200 characters)
- **categories**: App categories for discovery
- **features**: List of key features
- **capabilities**: Supported capabilities (file_search, web_search, etc.)
- **api_endpoints**: API endpoints for app functionality

## Usage

### State Management

```typescript
import { openAIAppStore, getAuthenticatedHeaders } from '@prisma/lib/openai/apps-sdk';

// Set session
openAIAppStore.setSession('session-id', 'user-id');

// Set workspace
openAIAppStore.setWorkspace('workspace-id');

// Set OAuth tokens
openAIAppStore.setTokens('access-token', 'refresh-token', 3600);

// Check authentication status
if (openAIAppStore.isAuthenticated()) {
  // Make authenticated API calls
  const headers = getAuthenticatedHeaders();
  // Use headers in fetch requests
}

// Clear state
openAIAppStore.clear();
```

### OAuth Authentication

```typescript
import { generateOAuthUrl, exchangeCodeForTokens } from '@prisma/lib/openai/apps-sdk';

// Generate OAuth URL
const oauthUrl = generateOAuthUrl({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/auth/openai/callback',
  scopes: ['openid', 'profile', 'email'],
  state: 'random-state-string',
});

// After user authorizes, exchange code for tokens
const tokens = await exchangeCodeForTokens(code, {
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/auth/openai/callback',
  scopes: ['openid', 'profile', 'email'],
});
```

### ChatKit Widgets

```typescript
import {
  createButtonWidget,
  createCardWidget,
  createTextWidget,
  validateWidget,
} from '@prisma/lib/openai/chatkit';

// Create a button widget
const buttonWidget = createButtonWidget({
  label: 'Submit',
  variant: 'primary',
  actions: [{
    type: 'submit',
    callback: 'handleSubmit',
  }],
});

// Create a card widget with content
const cardWidget = createCardWidget({
  header: 'Document Review',
  content: [
    createTextWidget({
      content: 'Please review the following document',
      format: 'markdown',
    }),
    buttonWidget,
  ],
});

// Validate widget
const validation = validateWidget(buttonWidget);
if (!validation.valid) {
  console.error('Widget validation errors:', validation.errors);
}
```

### Metadata Optimization

```typescript
import { optimizeMetadata, generateOpenGraphMetadata } from '@prisma/lib/openai/apps-sdk';

const metadata = optimizeMetadata({
  title: 'Prisma Glow',
  description: 'AI-powered audit and accounting platform',
  image: { url: 'https://your-app.com/icon.png' },
  url: 'https://your-app.com',
});

const ogMetadata = generateOpenGraphMetadata(metadata);
```

## API Routes

### OAuth Callback

Create an API route at `/api/auth/openai/callback` to handle OAuth callbacks:

```typescript
// app/api/auth/openai/callback/route.ts
import { exchangeCodeForTokens } from '@prisma/lib/openai/apps-sdk';
import { openAIAppStore } from '@prisma/lib/openai/apps-sdk';

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code, {
      clientId: process.env.OPENAI_APP_OAUTH_CLIENT_ID!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/openai/callback`,
      scopes: ['openid', 'profile', 'email'],
    });

    openAIAppStore.setTokens(
      tokens.accessToken,
      tokens.refreshToken || '',
      tokens.expiresIn
    );

    return Response.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);
  } catch (error) {
    console.error('OAuth error:', error);
    return new Response('Authentication failed', { status: 500 });
  }
}
```

## App Store Submission

### Checklist

Before submitting your app to the OpenAI ChatGPT App Store:

- [ ] App configuration file is accessible at `/.well-known/openai-app-config.json`
- [ ] All required metadata fields are filled
- [ ] Description is 200 characters or less
- [ ] Title is 50 characters or less
- [ ] Icon is 512x512 PNG
- [ ] All API endpoints use HTTPS
- [ ] OAuth flow is implemented and tested
- [ ] Error handling is implemented
- [ ] UI follows OpenAI UI guidelines
- [ ] App works in iframe context
- [ ] State management is properly implemented
- [ ] File search integration is working (if enabled)
- [ ] ChatKit widgets are functional (if enabled)

### UI Guidelines Compliance

- Use clear, readable fonts
- Maintain consistent spacing and layout
- Provide clear error messages
- Support keyboard navigation
- Ensure color contrast meets WCAG standards
- Test in iframe context (ChatGPT App Store apps run in iframes)
- Avoid pop-ups or modal dialogs that break iframe context
- Use relative URLs for navigation

### UX Principles

- **Clarity**: Make it clear what the app does and how to use it
- **Feedback**: Provide immediate feedback for user actions
- **Error Handling**: Handle errors gracefully with helpful messages
- **Performance**: Optimize for fast loading and responsive interactions
- **Accessibility**: Ensure the app is accessible to all users

## Testing

### Local Testing

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Verify configuration is accessible:
   ```bash
   curl http://localhost:3000/.well-known/openai-app-config.json
   ```

3. Test OAuth flow locally using a tool like ngrok for HTTPS redirect URI

### Integration Testing

Test the following scenarios:

- OAuth authentication flow
- Token refresh
- API calls with authenticated headers
- Widget creation and validation
- Error handling
- State management
- File search integration
- ChatKit widget rendering

## Troubleshooting

### Common Issues

**Configuration not found**
- Ensure `.well-known/openai-app-config.json` is in the `public` directory
- Verify the file is accessible at the root URL

**OAuth errors**
- Check that redirect URI matches exactly (including protocol and port)
- Verify client ID and secret are correct
- Ensure OAuth endpoint is correct

**Token expiration**
- Implement token refresh logic
- Check token expiration times
- Handle refresh token rotation

**Widget validation errors**
- Use `validateWidget()` before sending widgets
- Check widget structure matches specification
- Verify required fields are present

## References

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk)
- [OpenAI App Submission Guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines)
- [OpenAI UI Guidelines](https://developers.openai.com/apps-sdk/concepts/ui-guidelines)
- [OpenAI UX Principles](https://developers.openai.com/apps-sdk/concepts/ux-principles)
- [ChatKit Widgets Documentation](https://platform.openai.com/docs/guides/chatkit-widgets)
- [OpenAI Agent Builder Guide](https://platform.openai.com/docs/guides/agent-builder)

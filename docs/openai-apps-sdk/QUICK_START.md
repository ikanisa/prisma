# OpenAI Apps SDK Quick Start Guide

This guide will help you quickly set up and configure the OpenAI Apps SDK integration for Prisma Glow.

## Prerequisites

- Node.js 22.12.0 or higher
- pnpm 9.12.3 or higher
- OpenAI App Store developer account (when available)
- OpenAI OAuth credentials (from OpenAI developer portal)

## Step 1: Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Enable OpenAI App integration
NEXT_PUBLIC_OPENAI_APP_ENABLED=true

# OpenAI OAuth Configuration
# Get these from OpenAI Developer Portal > Your App > OAuth Settings
OPENAI_APP_OAUTH_CLIENT_ID=your_client_id_here
OPENAI_APP_OAUTH_CLIENT_SECRET=your_client_secret_here

# Optional: Custom OAuth endpoints (usually not needed)
# OPENAI_OAUTH_TOKEN_URL=https://api.openai.com/v1/oauth/token

# Required: Your app URL (must match OAuth redirect URI)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_APP_URL=https://your-production-domain.com  # Production
```

### Getting OAuth Credentials

1. Navigate to [OpenAI Developer Portal](https://platform.openai.com)
2. Go to your app settings
3. Navigate to "OAuth" or "Authentication" section
4. Create OAuth application
5. Set redirect URI to: `https://your-domain.com/api/auth/openai/callback`
6. Copy Client ID and Client Secret

**Important:** The redirect URI must exactly match your app's callback URL, including protocol and domain.

## Step 2: Verify Configuration

Verify that the app configuration file is accessible:

```bash
# Development
curl http://localhost:3000/.well-known/openai-app-config.json

# Should return JSON configuration
```

## Step 3: Test OAuth Flow

### 3.1 Start Development Server

```bash
cd apps/web
pnpm dev
```

### 3.2 Test OAuth Authorization

1. Navigate to a page that triggers OAuth (or create a test page)
2. Click "Sign in with OpenAI" (or your OAuth trigger)
3. You should be redirected to OpenAI authorization page
4. After authorization, you'll be redirected back to `/api/auth/openai/callback`
5. The callback will exchange the code for tokens and redirect to `/dashboard`

### 3.3 Verify Tokens

Check that tokens are stored in cookies:

```javascript
// In browser console
document.cookie.includes('openai_access_token') // Should be true
```

## Step 4: Using the Integration

### 4.1 State Management

```typescript
import { openAIAppStore, getAuthenticatedHeaders } from '@prisma/lib/openai/apps-sdk';

// Check authentication status
if (openAIAppStore.isAuthenticated()) {
  // Make authenticated API calls
  const headers = getAuthenticatedHeaders();
  
  const response = await fetch('/api/some-endpoint', {
    headers,
  });
}
```

### 4.2 OAuth Flow

```typescript
import { generateOAuthUrl } from '@prisma/lib/openai/apps-sdk';

// Generate OAuth URL
const oauthUrl = generateOAuthUrl({
  clientId: process.env.NEXT_PUBLIC_OPENAI_APP_OAUTH_CLIENT_ID!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/openai/callback`,
  scopes: ['openid', 'profile', 'email'],
  state: 'random-state-string-for-csrf',
});

// Redirect user to OAuth URL
window.location.href = oauthUrl;
```

### 4.3 ChatKit Widgets

```typescript
import {
  createButtonWidget,
  createCardWidget,
  createTextWidget,
  validateWidget,
} from '@prisma/lib/openai/chatkit';

// Create a widget
const buttonWidget = createButtonWidget({
  label: 'Submit',
  variant: 'primary',
  actions: [{
    type: 'submit',
    callback: 'handleSubmit',
  }],
});

// Validate widget
const validation = validateWidget(buttonWidget);
if (!validation.valid) {
  console.error('Widget errors:', validation.errors);
}
```

## Step 5: Testing Checklist

Before deployment, test the following:

- [ ] Configuration file is accessible at `/.well-known/openai-app-config.json`
- [ ] OAuth authorization URL is generated correctly
- [ ] OAuth callback receives authorization code
- [ ] Token exchange succeeds
- [ ] Tokens are stored in secure cookies
- [ ] Token refresh works
- [ ] Authenticated API calls include proper headers
- [ ] Widgets are created and validated correctly
- [ ] Error handling works for invalid credentials
- [ ] App works in iframe context (for ChatGPT App Store)

## Step 6: Deployment

### 6.1 Production Environment Variables

Set the following in your production environment:

```bash
NEXT_PUBLIC_OPENAI_APP_ENABLED=true
OPENAI_APP_OAUTH_CLIENT_ID=your_production_client_id
OPENAI_APP_OAUTH_CLIENT_SECRET=your_production_client_secret
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
NODE_ENV=production
```

### 6.2 Update OAuth Redirect URI

1. Go to OpenAI Developer Portal
2. Update your app's redirect URI to production URL:
   `https://your-production-domain.com/api/auth/openai/callback`

### 6.3 Verify Production Configuration

```bash
curl https://your-production-domain.com/.well-known/openai-app-config.json
```

### 6.4 Test Production OAuth Flow

1. Navigate to your production app
2. Test OAuth flow end-to-end
3. Verify tokens are stored correctly
4. Test token refresh
5. Verify error handling

## Troubleshooting

### OAuth Callback Fails

**Error:** "Token exchange failed"

**Solutions:**
- Verify `OPENAI_APP_OAUTH_CLIENT_ID` and `OPENAI_APP_OAUTH_CLIENT_SECRET` are correct
- Check that redirect URI in OpenAI portal matches exactly
- Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
- Check server logs for detailed error messages

### Configuration File Not Found

**Error:** 404 when accessing `/.well-known/openai-app-config.json`

**Solutions:**
- Verify file exists at `apps/web/public/.well-known/openai-app-config.json`
- Check that Next.js is serving static files from `public` directory
- Verify file permissions
- Clear Next.js cache and rebuild

### Tokens Not Stored

**Error:** Cookies not set after OAuth callback

**Solutions:**
- Check browser console for cookie errors
- Verify `NODE_ENV` is set correctly
- Check that cookies are allowed in browser
- Verify cookie settings (httpOnly, secure, sameSite)

### Widget Validation Fails

**Error:** Widget validation errors

**Solutions:**
- Check widget structure matches specification
- Verify required fields are present
- Use `validateWidget()` before sending widgets
- Check widget type is valid

## Next Steps

- Review [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- Read [Full Documentation](./README.md)
- Check [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- See [Enhancements Guide](./ENHANCEMENTS_AND_RECOMMENDATIONS.md)

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review OpenAI Apps SDK documentation
- Check server logs for detailed error messages
- Contact OpenAI support for OAuth issues

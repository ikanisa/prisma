# Why These OAuth Environment Variables Are Needed

This document explains why each environment variable is required for OpenAI Apps SDK integration.

## Overview

When deploying your app to the OpenAI ChatGPT App Store, users need to authenticate with OpenAI to use your app. This authentication uses OAuth 2.0, which requires these environment variables to work properly.

## Variable Breakdown

### 1. `NEXT_PUBLIC_OPENAI_APP_ENABLED`

**Purpose:** Feature flag to enable/disable OpenAI Apps SDK integration

**Why it's needed:**
- Allows you to enable/disable the integration without code changes
- Useful for staging environments or gradual rollouts
- Controls whether OpenAI App-specific features are active

**Where it's used:**
```typescript
// packages/lib/src/openai/apps-sdk/state.ts
export function isOpenAIAppEnabled(): boolean {
  return process.env.NEXT_PUBLIC_OPENAI_APP_ENABLED === 'true';
}

// Usage in your code:
if (isOpenAIAppEnabled()) {
  // Show OpenAI App features
  // Enable OAuth flows
  // Render OpenAI-specific UI
}
```

**Example scenarios:**
- **Development:** Set to `false` while developing, `true` when testing OAuth
- **Staging:** Set to `false` to test without OAuth, `true` for integration testing
- **Production:** Set to `true` when ready for OpenAI App Store deployment

**Why `NEXT_PUBLIC_` prefix?**
- Next.js exposes variables with this prefix to client-side code
- Needed if you want to conditionally render UI elements based on integration status
- Server-side code can also access it via `process.env`

---

### 2. `OPENAI_APP_OAUTH_CLIENT_ID`

**Purpose:** Identifies your app to OpenAI's OAuth server

**Why it's needed:**
- OAuth 2.0 requires a client ID to identify your application
- OpenAI uses this to know which app is requesting authorization
- Public identifier (safe to expose in client code if needed)
- Provided by OpenAI when you register your app

**Where it's used:**
```typescript
// apps/web/app/api/auth/openai/token/route.ts
const clientId = process.env.OPENAI_APP_OAUTH_CLIENT_ID;

// Used in OAuth token exchange:
body: new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  redirect_uri: redirect_uri,
  client_id: clientId,  // ← Identifies your app
  client_secret: clientSecret,
})
```

**OAuth Flow:**
1. User clicks "Sign in with OpenAI" in your app
2. User is redirected to OpenAI's authorization page
3. OpenAI uses the `client_id` to show which app is requesting access
4. User authorizes your app
5. OpenAI redirects back with an authorization code
6. Your server exchanges the code for tokens using `client_id` + `client_secret`

**Without it:**
- OAuth flow cannot start
- OpenAI won't know which app is requesting access
- Token exchange will fail

---

### 3. `OPENAI_APP_OAUTH_CLIENT_SECRET`

**Purpose:** Proves your server is authorized to exchange tokens

**Why it's needed:**
- OAuth 2.0 security: Only your server should exchange authorization codes for tokens
- Prevents unauthorized parties from getting user tokens
- Must be kept secret (never exposed to client-side code)
- Provided by OpenAI when you register your app

**Where it's used:**
```typescript
// apps/web/app/api/auth/openai/token/route.ts
const clientSecret = process.env.OPENAI_APP_OAUTH_CLIENT_SECRET;

// Used ONLY server-side in token exchange:
body: new URLSearchParams({
  grant_type: 'authorization_code',
  code,
  redirect_uri: redirect_uri,
  client_id: clientId,
  client_secret: clientSecret,  // ← Proves server is authorized
})
```

**Security:**
- **Never** exposed to client-side JavaScript
- Stored securely (environment variables, secrets manager)
- Used only in server-side API routes
- Proves to OpenAI that the token exchange request is legitimate

**OAuth Security Flow:**
```
User Browser → Your App → Redirects to OpenAI
                                           ↓
User authorizes → OpenAI redirects back with CODE
                                           ↓
Your Server → Uses CLIENT_SECRET + CODE → Gets ACCESS_TOKEN
                                           ↓
Server stores token securely → User is authenticated
```

**Without it:**
- Token exchange will fail
- OpenAI will reject the request
- Users cannot authenticate
- Error: "OAuth credentials not configured"

---

## Why OAuth Instead of API Keys?

You might wonder: "We already have `OPENAI_API_KEY`, why do we need OAuth?"

### Different Purposes:

1. **`OPENAI_API_KEY`** - For YOUR app to call OpenAI APIs
   - Your server uses this to make API calls
   - Billed to your OpenAI account
   - Used for: Chat completions, embeddings, file search, etc.

2. **OAuth (`CLIENT_ID` + `CLIENT_SECRET`)** - For USERS to authenticate
   - Users authorize YOUR app through OpenAI
   - Creates user sessions
   - Used for: User authentication, session management, ChatGPT App Store integration

### ChatGPT App Store Context:

When your app is in the ChatGPT App Store:
- Users are already logged into ChatGPT
- OAuth allows seamless authentication
- Users don't need separate accounts
- Tokens link ChatGPT sessions to your app

---

## Real-World Example

### Scenario: User opens your app in ChatGPT

```
1. User clicks on "Prisma Glow" in ChatGPT App Store
   ↓
2. ChatGPT loads your app in an iframe
   ↓
3. Your app checks: Is OpenAI App enabled?
   → Checks: NEXT_PUBLIC_OPENAI_APP_ENABLED === 'true'
   ↓
4. Your app initiates OAuth flow
   → Uses: OPENAI_APP_OAUTH_CLIENT_ID to identify app
   → Redirects user to OpenAI authorization
   ↓
5. User authorizes (or is already authorized)
   ↓
6. OpenAI redirects back with authorization code
   ↓
7. Your server exchanges code for tokens
   → Uses: OPENAI_APP_OAUTH_CLIENT_ID + OPENAI_APP_OAUTH_CLIENT_SECRET
   → Gets: access_token, refresh_token
   ↓
8. User is authenticated and can use your app
```

---

## Can We Skip These Variables?

### ❌ Without `NEXT_PUBLIC_OPENAI_APP_ENABLED`:
- You can hardcode the feature, but lose flexibility
- Cannot disable integration without code changes
- Not recommended for production

### ❌ Without `OPENAI_APP_OAUTH_CLIENT_ID`:
- OAuth flow cannot start
- OpenAI won't identify your app
- Users cannot authenticate
- **App will not work in ChatGPT App Store**

### ❌ Without `OPENAI_APP_OAUTH_CLIENT_SECRET`:
- Token exchange will fail
- Users cannot get authenticated
- Security risk (anyone could exchange codes)
- **App will not work in ChatGPT App Store**

---

## Summary

| Variable | Purpose | Required | Can Skip? |
|----------|---------|----------|-----------|
| `NEXT_PUBLIC_OPENAI_APP_ENABLED` | Feature flag | Recommended | Yes (but lose flexibility) |
| `OPENAI_APP_OAUTH_CLIENT_ID` | App identification | **Yes** | No - OAuth won't work |
| `OPENAI_APP_OAUTH_CLIENT_SECRET` | Server authentication | **Yes** | No - Token exchange fails |

**Bottom line:** If you want your app to work in the OpenAI ChatGPT App Store, you **must** have the OAuth credentials (`CLIENT_ID` and `CLIENT_SECRET`). The feature flag is optional but recommended for better control.

---

## Getting These Variables

1. Go to [OpenAI Developer Portal](https://platform.openai.com)
2. Navigate to your app settings
3. Go to "OAuth" or "Authentication" section
4. Create OAuth application
5. Copy the Client ID and Client Secret
6. Set redirect URI: `https://your-domain.com/api/auth/openai/callback`

**Note:** These are provided by OpenAI when you register your app for the ChatGPT App Store.

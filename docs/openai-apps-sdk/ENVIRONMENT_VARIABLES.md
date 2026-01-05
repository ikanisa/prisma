# OpenAI Apps SDK Environment Variables

This document lists all environment variables required for OpenAI Apps SDK integration.

## Required Variables

### NEXT_PUBLIC_OPENAI_APP_ENABLED
**Required:** Yes (for Apps SDK integration)  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable OpenAI ChatGPT App Store integration.

```bash
NEXT_PUBLIC_OPENAI_APP_ENABLED=true
```

### OPENAI_APP_OAUTH_CLIENT_ID
**Required:** Yes (for OAuth)  
**Description:** OAuth client ID from OpenAI Developer Portal.

```bash
OPENAI_APP_OAUTH_CLIENT_ID=your_client_id_here
```

**How to get:**
1. Navigate to OpenAI Developer Portal
2. Go to your app settings
3. Navigate to "OAuth" or "Authentication" section
4. Create OAuth application
5. Copy Client ID

### OPENAI_APP_OAUTH_CLIENT_SECRET
**Required:** Yes (for OAuth)  
**Type:** Secret  
**Description:** OAuth client secret from OpenAI Developer Portal.

```bash
OPENAI_APP_OAUTH_CLIENT_SECRET=your_client_secret_here
```

**Security:**
- Store in secrets manager (never commit to git)
- Use different secrets for development and production
- Rotate regularly
- Never expose in client-side code

**How to get:**
1. Navigate to OpenAI Developer Portal
2. Go to your app settings
3. Navigate to "OAuth" or "Authentication" section
4. Copy Client Secret (only shown once)

## Optional Variables

### OPENAI_OAUTH_TOKEN_URL
**Required:** No  
**Default:** `https://api.openai.com/v1/oauth/token`  
**Description:** Custom OAuth token endpoint URL.

```bash
OPENAI_OAUTH_TOKEN_URL=https://api.openai.com/v1/oauth/token
```

**Note:** Usually not needed unless OpenAI provides a custom endpoint.

### NEXT_PUBLIC_APP_URL
**Required:** Yes (must match OAuth redirect URI)  
**Description:** Your app's public URL (used for OAuth redirects).

```bash
# Development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

**Important:** The redirect URI in OpenAI OAuth settings must exactly match:
`${NEXT_PUBLIC_APP_URL}/api/auth/openai/callback`

## Adding to .env Files

### Development (.env.local)

```bash
# OpenAI Apps SDK
NEXT_PUBLIC_OPENAI_APP_ENABLED=true
OPENAI_APP_OAUTH_CLIENT_ID=your_dev_client_id
OPENAI_APP_OAUTH_CLIENT_SECRET=your_dev_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production

```bash
# OpenAI Apps SDK
NEXT_PUBLIC_OPENAI_APP_ENABLED=true
OPENAI_APP_OAUTH_CLIENT_ID=your_prod_client_id
OPENAI_APP_OAUTH_CLIENT_SECRET=your_prod_client_secret
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

## Validation

The following validation is performed:

1. **OAuth Credentials**: Must be set if `NEXT_PUBLIC_OPENAI_APP_ENABLED=true`
2. **Redirect URI**: Must match exactly between env var and OpenAI portal
3. **URL Format**: `NEXT_PUBLIC_APP_URL` must be a valid HTTPS URL in production

## Security Checklist

- [ ] OAuth client secret stored in secrets manager
- [ ] Different credentials for development and production
- [ ] HTTPS enabled in production
- [ ] Redirect URI matches exactly
- [ ] Credentials never committed to git
- [ ] Credentials rotated regularly
- [ ] Environment variables documented
- [ ] Team has access to credentials via secure method

## Integration with Existing Variables

These variables work alongside existing OpenAI variables:

- `OPENAI_API_KEY` - For API calls (separate from OAuth)
- `OPENAI_AGENT_PLATFORM_ENABLED` - For agent platform
- `OPENAI_STREAMING_ENABLED` - For streaming
- `OPENAI_REALTIME_ENABLED` - For realtime

The Apps SDK OAuth is separate from API key authentication and is used specifically for ChatGPT App Store integration.

## Troubleshooting

### "OAuth credentials not configured"
- Verify `OPENAI_APP_OAUTH_CLIENT_ID` and `OPENAI_APP_OAUTH_CLIENT_SECRET` are set
- Check that environment variables are loaded correctly
- Verify `.env.local` file exists and is in the correct location

### "Redirect URI mismatch"
- Verify `NEXT_PUBLIC_APP_URL` matches your actual domain
- Check redirect URI in OpenAI portal matches: `${NEXT_PUBLIC_APP_URL}/api/auth/openai/callback`
- Ensure protocol (http/https) matches exactly

### "Token exchange failed"
- Verify client ID and secret are correct
- Check that OAuth application is active in OpenAI portal
- Verify redirect URI matches exactly
- Check server logs for detailed error messages

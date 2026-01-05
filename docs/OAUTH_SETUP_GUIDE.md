# OAuth Setup Guide for OpenAI Developer Portal

Step-by-step guide to set up OAuth for ChatGPT App Store submission.

## Prerequisites

- OpenAI Developer account
- Access to OpenAI Developer Portal
- Your app deployed and accessible via HTTPS

## Step 1: Access OpenAI Developer Portal

1. Go to https://platform.openai.com
2. Sign in with your OpenAI account
3. Navigate to "Apps" in the sidebar

## Step 2: Create New App

1. Click "Create App" or "New App"
2. Fill in app details:
   - **Name**: Prisma Glow
   - **Description**: AI-powered audit, tax, and accounting operations platform with intelligent agents, knowledge management, and automated workflows
   - **Category**: Business / Productivity
   - **Website**: https://your-domain.com
   - **Privacy Policy URL**: https://your-domain.com/privacy
   - **Terms of Service URL**: https://your-domain.com/terms

3. Click "Create" or "Save"

## Step 3: Configure OAuth

1. In your app settings, navigate to "OAuth" or "Authentication"
2. Click "Create OAuth Application" or "Add OAuth Client"
3. Fill in OAuth details:
   - **Application Name**: Prisma Glow
   - **Redirect URI**: `https://your-domain.com/api/auth/openai/callback`
     - ⚠️ **Important**: This must match exactly, including the protocol (https)
   - **Scopes**: Select:
     - `openid` (required)
     - `profile` (required)
     - `email` (required)

4. Click "Create" or "Save"

## Step 4: Copy Credentials

After creating the OAuth application, you'll see:

- **Client ID**: Copy this value
- **Client Secret**: Copy this value immediately (it's only shown once!)

⚠️ **Security Note**: Store the Client Secret securely. Never commit it to version control.

## Step 5: Update Environment Variables

Add to your `.env.local` file:

```bash
OPENAI_APP_OAUTH_CLIENT_ID=<paste_client_id_here>
OPENAI_APP_OAUTH_CLIENT_SECRET=<paste_client_secret_here>
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 6: Test OAuth Flow

1. **Start your development server**:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Run the OAuth test script**:
   ```bash
   npx tsx scripts/test-oauth.ts
   ```

3. **Manual test**:
   - Visit: `http://localhost:3000/api/auth/openai/authorize`
   - Should redirect to OpenAI OAuth page
   - After authorization, should redirect back to your app
   - Check database for stored tokens

## Step 7: Verify OAuth Configuration

### Check Authorization Endpoint

```bash
curl -I http://localhost:3000/api/auth/openai/authorize
```

Should return 302 redirect to OpenAI.

### Check Callback Endpoint

```bash
curl -I http://localhost:3000/api/auth/openai/callback
```

Should return 302 redirect (to login if not authenticated).

### Check Token Exchange Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/openai/token \
  -H "Content-Type: application/json" \
  -d '{"code":"test","redirect_uri":"http://localhost:3000/api/auth/openai/callback"}'
```

Should return error (invalid code) but endpoint should exist.

## Step 8: Production Deployment

Before deploying to production:

1. **Update redirect URI in OpenAI Portal**:
   - Change from `http://localhost:3000` to `https://your-domain.com`
   - Update in OAuth application settings

2. **Update environment variables**:
   ```bash
   OPENAI_APP_OAUTH_CLIENT_ID=<production_client_id>
   OPENAI_APP_OAUTH_CLIENT_SECRET=<production_client_secret>
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```

3. **Test production OAuth flow**:
   - Visit: `https://your-domain.com/api/auth/openai/authorize`
   - Complete authorization
   - Verify tokens stored

## Troubleshooting

### Redirect URI Mismatch

**Error**: "redirect_uri_mismatch"

**Solution**:
- Verify redirect URI in OpenAI Portal matches exactly
- Check for trailing slashes
- Ensure protocol is https in production

### Invalid Client Secret

**Error**: "invalid_client"

**Solution**:
- Verify `OPENAI_APP_OAUTH_CLIENT_SECRET` is correct
- Check for extra spaces or quotes
- Regenerate client secret if needed

### Token Exchange Fails

**Error**: "invalid_grant"

**Solution**:
- Verify authorization code is valid
- Check code hasn't expired (usually 10 minutes)
- Ensure redirect URI matches exactly

### Callback Not Reached

**Error**: Callback endpoint not called

**Solution**:
- Check redirect URI in OpenAI Portal
- Verify callback endpoint is accessible
- Check CORS settings
- Review server logs

## Security Best Practices

1. **Never commit secrets**:
   - Use `.env.local` (gitignored)
   - Use secret management in production (AWS Secrets Manager, etc.)

2. **Rotate secrets regularly**:
   - Rotate client secret every 90 days
   - Update environment variables immediately

3. **Use HTTPS in production**:
   - OAuth requires HTTPS
   - Never use HTTP for OAuth in production

4. **Validate redirect URIs**:
   - Only allow known redirect URIs
   - Reject unknown redirects

## Next Steps

After OAuth is configured:

1. ✅ Test OAuth flow end-to-end
2. ✅ Verify tokens are stored in database
3. ✅ Test MCP server with OAuth tokens
4. ✅ Prepare ChatGPT App Store submission
5. ✅ Submit app for review

## Support

If you encounter issues:

1. Check OpenAI Developer Portal documentation
2. Review server logs
3. Test with OAuth test script
4. Verify environment variables
5. Check redirect URI configuration

For OpenAI support, contact: support@openai.com


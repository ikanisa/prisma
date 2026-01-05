# ChatGPT App Store Submission Guide

Complete guide for submitting Prisma Glow to the ChatGPT App Store.

## Prerequisites

- ✅ OAuth configured and tested
- ✅ MCP server accessible at `/api/mcp`
- ✅ App config at `/.well-known/openai-app-config.json`
- ✅ ChatGPT UI at `/chatgpt` works
- ✅ Privacy policy published
- ✅ Terms of service published
- ✅ App deployed and accessible via HTTPS

## Pre-Submission Checklist

### 1. App Configuration

- [ ] Verify `/.well-known/openai-app-config.json` is accessible
- [ ] All required fields filled
- [ ] OAuth client ID configured
- [ ] API endpoints correct
- [ ] Capabilities listed accurately

**Test**:
```bash
curl https://your-domain.com/.well-known/openai-app-config.json | jq
```

### 2. MCP Server

- [ ] Accessible at `/api/mcp`
- [ ] Returns tool list correctly
- [ ] Tool calls work with authentication
- [ ] Error handling works

**Test**:
```bash
# Test tools/list
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Should return list of tools
```

### 3. OAuth Flow

- [ ] Authorization endpoint works
- [ ] Callback endpoint works
- [ ] Token exchange works
- [ ] Tokens stored in database

**Test**:
```bash
npx tsx scripts/test-oauth.ts
```

### 4. ChatGPT UI

- [ ] Page loads at `/chatgpt`
- [ ] Renders correctly in iframe
- [ ] Widgets work
- [ ] Actions communicate with ChatGPT

**Test**:
```bash
npx tsx scripts/test-chatgpt-ui.ts
```

### 5. Security

- [ ] HTTPS enabled
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] Error messages don't leak info
- [ ] CORS configured correctly

### 6. Documentation

- [ ] User guide available
- [ ] API documentation
- [ ] Privacy policy published
- [ ] Terms of service published

## Submission Package

### Required Files

1. **App Config** (already at `/.well-known/openai-app-config.json`)
   - Verify all fields are correct
   - Test accessibility

2. **App Icon** (512x512 PNG)
   - Save to: `apps/web/public/icons/icon-512.png`
   - Must be square
   - High quality
   - Represents your app

3. **Screenshots** (at least 3, recommended 5)
   - Save to: `apps/web/public/screenshots/`
   - Recommended sizes: 1280x720 or 1920x1080
   - Show key features:
     - Command Center interface
     - Chat interaction
     - Widget examples
     - Engagement management
     - Document processing

4. **App Description** (500 words max)
   - Clear value proposition
   - Key features
   - Use cases
   - Target audience

### Prepare Description

Create `docs/app-store-description.md`:

```markdown
# Prisma Glow - App Store Description

## Short Description (100 chars)
AI-powered audit, tax, and accounting operations platform with intelligent agents and automated workflows.

## Full Description (500 words)

Prisma Glow is an AI-first platform designed for accounting, audit, and tax professionals. It transforms traditional workflows into intelligent, chat-driven operations.

### Key Features

**AI-Powered Command Center**
- Chat-first interface for all operations
- Intelligent agent routing
- Context-aware assistance
- Real-time collaboration

**Engagement Management**
- Create and manage audit engagements
- Track document requests
- Generate compliance reports
- Automated workflow orchestration

**Document Processing**
- Upload and classify documents
- Extract entities automatically
- Generate document checklists
- Knowledge base integration

**Tax & Compliance**
- Tax calculation tools
- Jurisdiction-specific guidance
- Management letter generation
- Tax summary reports

**Knowledge Base**
- Search IFRS/ISA guidance
- Access tax regulations
- Find compliance requirements
- Get expert answers

### Use Cases

- **Audit Firms**: Streamline audit workflows, manage engagements, generate reports
- **Tax Professionals**: Calculate taxes, access guidance, prepare returns
- **Accounting Teams**: Process documents, extract data, generate summaries
- **Compliance Officers**: Monitor requirements, track deadlines, generate reports

### How It Works

1. Start a conversation in the Command Center
2. AI routes your request to the right agent
3. Agents execute tools to complete tasks
4. Results displayed as structured widgets
5. Take actions directly from widgets

### Security & Privacy

- Enterprise-grade security
- Role-based access control
- Audit logging
- Data encryption
- GDPR compliant

### Integration

- Supabase backend
- OpenAI GPT models
- ChatGPT App Store ready
- MCP protocol support

### Target Audience

- Audit professionals
- Tax advisors
- Accounting teams
- Compliance officers
- Financial consultants

### Getting Started

1. Sign up for an account
2. Complete onboarding
3. Start chatting in Command Center
4. Create your first engagement
5. Let AI guide you through workflows

Prisma Glow makes complex accounting and audit tasks simple through AI-powered automation and intelligent assistance.
```

## Submission Steps

### Step 1: Prepare Files

1. **Verify app config**:
   ```bash
   curl https://your-domain.com/.well-known/openai-app-config.json > app-config.json
   # Review and verify
   ```

2. **Prepare screenshots**:
   - Take screenshots of key features
   - Save as PNG files
   - Name descriptively: `screenshot-1-command-center.png`, etc.

3. **Prepare icon**:
   - Create 512x512 PNG
   - Save as `icon-512.png`

4. **Write description**:
   - Use template above
   - Keep under 500 words
   - Highlight key features

### Step 2: Submit in Developer Portal

1. **Go to OpenAI Developer Portal**
   - Visit https://platform.openai.com
   - Navigate to "Apps" → Your App

2. **Click "Submit for Review"**
   - Or "Publish" or "Submit to App Store"

3. **Fill in Submission Form**:
   - App name: Prisma Glow
   - Description: (paste from prepared description)
   - Category: Business / Productivity
   - Tags: accounting, audit, tax, ai, automation, compliance

4. **Upload Files**:
   - App icon: `icon-512.png`
   - Screenshots: Upload all screenshots
   - App config: URL to `/.well-known/openai-app-config.json`

5. **Configure Settings**:
   - OAuth: Verify client ID is set
   - MCP endpoint: `https://your-domain.com/api/mcp`
   - ChatGPT UI: `https://your-domain.com/chatgpt`

6. **Review and Submit**:
   - Review all information
   - Check for errors
   - Click "Submit"

### Step 3: Review Process

1. **Initial Review** (1-3 days)
   - OpenAI reviews submission
   - Checks for compliance
   - Tests functionality

2. **Feedback** (if needed)
   - OpenAI may request changes
   - Address feedback promptly
   - Resubmit if needed

3. **Approval** (1-2 weeks total)
   - App approved
   - Goes live in App Store
   - Users can discover and install

## Post-Submission

### Monitor

- Track app usage
- Monitor error rates
- Review user feedback
- Update based on feedback

### Updates

- Submit updates through Developer Portal
- Follow same review process
- Keep app config updated

### Support

- Respond to user questions
- Fix bugs promptly
- Add requested features
- Maintain documentation

## Common Rejection Reasons

1. **OAuth not working**
   - Test OAuth flow before submission
   - Verify redirect URI

2. **MCP server errors**
   - Test all tools
   - Verify authentication

3. **UI not working in iframe**
   - Test in iframe
   - Check X-Frame-Options

4. **Missing documentation**
   - Provide privacy policy
   - Provide terms of service

5. **Security issues**
   - Enable HTTPS
   - Fix security vulnerabilities

## Success Metrics

After approval, track:

- Number of installs
- Active users
- Tool usage
- Error rates
- User ratings

## Support

For submission questions:
- OpenAI Developer Portal support
- Review submission guidelines
- Check status in Developer Portal

Good luck with your submission! 🚀


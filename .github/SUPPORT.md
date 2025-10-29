# Support

Thank you for using Prisma Glow! This document explains how to get help with the platform.

## Table of Contents

- [Getting Help](#getting-help)
- [Reporting Issues](#reporting-issues)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Feature Requests](#feature-requests)
- [Community](#community)
- [Commercial Support](#commercial-support)

---

## Getting Help

### Documentation

Before reaching out for support, please check our comprehensive documentation:

- **[README](../README.md)** - Getting started, setup instructions, and basic usage
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to the project
- **[Architecture Docs](../docs/)** - Detailed architecture and design documentation
- **[API Documentation](../openapi/)** - API specifications and usage examples
- **[Deployment Guide](../docs/deployment/)** - Deployment and infrastructure setup
- **[Runbooks](../docs/)** - Operational procedures and troubleshooting

### Common Issues

#### Installation Problems

**Issue**: `pnpm install` fails  
**Solution**: Ensure you're using Node.js 22.12.0 (or 20.19.4 for CI) and pnpm 9.12.3:
```bash
node --version  # Should show v22.12.0 or v20.19.4
pnpm --version  # Should show 9.12.3
pnpm install --frozen-lockfile
```

**Issue**: Build fails with TypeScript errors  
**Solution**: Run typecheck first to see detailed errors:
```bash
pnpm run typecheck
```

**Issue**: Python dependencies fail to install  
**Solution**: Ensure Python 3.11+ is installed:
```bash
python3 --version  # Should show 3.11 or higher
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r server/requirements.txt
```

#### Runtime Issues

**Issue**: Supabase client errors  
**Solution**: Check environment variables:
```bash
# Ensure these are set in .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://...
```

**Issue**: OpenAI API errors  
**Solution**: Verify your API key is set:
```bash
# In .env.local
OPENAI_API_KEY=sk-...
```

**Issue**: Port already in use  
**Solution**: Check which services are using the port:
```bash
# Find process on port 3000
lsof -i :3000
# Kill process if needed
kill -9 <PID>
```

---

## Reporting Issues

### Before Reporting

1. **Search existing issues** - Check if your issue has already been reported: [GitHub Issues](https://github.com/ikanisa/prisma/issues)
2. **Check recent releases** - Your issue may be fixed in a newer version
3. **Gather information** - Collect logs, error messages, and reproduction steps

### How to Report

Report issues via [GitHub Issues](https://github.com/ikanisa/prisma/issues/new). Please include:

1. **Clear title** - Summarize the issue in one line
2. **Description** - Explain what happened and what you expected
3. **Reproduction steps** - Step-by-step instructions to reproduce the issue
4. **Environment**:
   - OS (macOS, Linux, Windows)
   - Node.js version (`node --version`)
   - pnpm version (`pnpm --version`)
   - Python version (if applicable, `python3 --version`)
   - Browser (if UI issue)
5. **Logs and errors** - Include relevant log output
6. **Screenshots** - If applicable, especially for UI issues

### Issue Labels

We use the following labels to categorize issues:

- `bug` - Something isn't working
- `feature` - New feature or enhancement request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested
- `security` - Security-related issue
- `area:backend` - Backend/API issue
- `area:frontend` - Frontend/UI issue
- `area:infra` - Infrastructure/DevOps issue
- `area:data` - Database/data-related issue
- `severity:S0` - Critical (production outage)
- `severity:S1` - High (major feature broken)
- `severity:S2` - Medium (feature degraded)
- `severity:S3` - Low (minor issue)

### Response Times

| Severity | Initial Response | Resolution Target |
|----------|------------------|-------------------|
| S0 (Critical) | 4 hours | 24 hours |
| S1 (High) | 1 business day | 1 week |
| S2 (Medium) | 3 business days | 2 weeks |
| S3 (Low) | 1 week | Best effort |

**Note**: Response times are for active contributors and maintainers. Community contributions are welcome to help triage and resolve issues faster.

---

## Security Vulnerabilities

**DO NOT report security vulnerabilities via public GitHub issues.**

If you discover a security vulnerability, please follow our [Security Policy](../SECURITY.md):

1. **Email**: Send details to **security@prismaglow.com** (or via GitHub Security Advisories)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)
3. **Confidentiality**: Keep the vulnerability confidential until we release a fix
4. **Timeline**: We aim to acknowledge within 48 hours and provide updates weekly

See [SECURITY.md](../SECURITY.md) for complete vulnerability reporting guidelines.

---

## Feature Requests

We welcome feature requests! Before submitting:

1. **Search existing requests** - Check if someone already suggested it
2. **Review roadmap** - See if it's already planned (check project boards)
3. **Consider scope** - Is it broadly applicable or very specific to your use case?

### How to Request a Feature

1. Open a [Feature Request](https://github.com/ikanisa/prisma/issues/new?labels=feature)
2. **Describe the problem** - What are you trying to achieve?
3. **Propose a solution** - How would you like it to work?
4. **Alternatives** - What workarounds have you tried?
5. **Use cases** - Who else would benefit from this feature?

### Feature Request Evaluation

Features are evaluated based on:
- **Alignment** - Does it fit the product vision?
- **Impact** - How many users will benefit?
- **Effort** - How complex is the implementation?
- **Maintenance** - What's the long-term maintenance cost?

---

## Community

### Discussion Channels

- **GitHub Discussions** - [General discussions, Q&A, ideas](https://github.com/ikanisa/prisma/discussions)
- **Slack/Discord** - Real-time chat with the community (invite link: TBD)
- **Stack Overflow** - Tag questions with `prisma-glow`

### Contributing

We welcome contributions! See [CONTRIBUTING.md](../CONTRIBUTING.md) for:
- Code contribution guidelines
- Pull request process
- Coding standards
- Testing requirements
- Architecture Decision Record (ADR) requirements

### Community Guidelines

We're committed to providing a welcoming and inclusive environment. Please:
- Be respectful and constructive
- Help others learn and grow
- Give credit where due
- Follow our Code of Conduct (TBD)

---

## Commercial Support

### Enterprise Support

For organizations requiring dedicated support, we offer:

- **Priority response times** (SLA-backed)
- **Dedicated support channel** (email/Slack)
- **Architecture review and consultation**
- **Custom feature development**
- **Training and onboarding**
- **24/7 on-call support** (for critical issues)

Contact: **enterprise@prismaglow.com**

### Professional Services

We offer professional services including:
- **Deployment assistance** - Help with production deployment
- **Performance optimization** - Tuning for your workload
- **Custom integrations** - Connect with your existing systems
- **Training workshops** - Onboard your team
- **Code reviews** - Security and best practices audit

Contact: **services@prismaglow.com**

### Consulting

For strategic guidance and architecture consultation:
- **Roadmap planning** - Align Prisma Glow with your business goals
- **Scalability planning** - Design for growth
- **Compliance assistance** - GDPR, SOC 2, ISO 27001
- **Proof of concept** - Validate fit before full rollout

Contact: **consulting@prismaglow.com**

---

## SLA Commitments (For Supported Customers)

| Support Tier | Response Time | Resolution Target | Availability |
|--------------|---------------|-------------------|--------------|
| Community | Best effort | Best effort | GitHub Issues |
| Professional | 4 business hours | Based on severity | Email + Slack |
| Enterprise | 1 hour (S0/S1) | 24h (S0), 72h (S1) | 24/7 on-call |

**Severity Definitions**:
- **S0 (Critical)**: Production system down, data loss risk
- **S1 (High)**: Major feature broken, significant user impact
- **S2 (Medium)**: Feature degraded, workaround available
- **S3 (Low)**: Minor issue, cosmetic bug

---

## Frequently Asked Questions

### Can I use Prisma Glow in production?

Yes, but please review the [Go-Live Readiness Report](../docs/go-live-readiness-report.md) and address all S0 and S1 issues before deploying to production.

### Is there a hosted version?

Not currently. Prisma Glow is self-hosted. Contact **sales@prismaglow.com** for information about future hosted offerings.

### What's the license?

See [LICENSE](../LICENSE) for licensing terms.

### How do I upgrade to a new version?

See [Release Runbook](../docs/release-runbook.md) for upgrade procedures, including rollback steps.

### Can I contribute to the project?

Absolutely! See [CONTRIBUTING.md](../CONTRIBUTING.md) to get started.

### Where can I find the API documentation?

OpenAPI specifications are in the [`openapi/`](../openapi/) directory. You can also access interactive API docs at `/docs` endpoint when running the FastAPI backend.

---

## Contact Information

| Purpose | Contact |
|---------|---------|
| General inquiries | info@prismaglow.com |
| Security issues | security@prismaglow.com |
| Enterprise support | enterprise@prismaglow.com |
| Professional services | services@prismaglow.com |
| Sales | sales@prismaglow.com |
| GitHub Issues | https://github.com/ikanisa/prisma/issues |
| GitHub Discussions | https://github.com/ikanisa/prisma/discussions |

---

**Note**: Email addresses above are placeholders. Update with actual contact information before go-live.

---

## Support Resources

- 📚 [Documentation](../README.md)
- 🐛 [Report a Bug](https://github.com/ikanisa/prisma/issues/new?labels=bug)
- 💡 [Request a Feature](https://github.com/ikanisa/prisma/issues/new?labels=feature)
- 🔒 [Report Security Issue](../SECURITY.md)
- 💬 [GitHub Discussions](https://github.com/ikanisa/prisma/discussions)
- 🤝 [Contributing Guide](../CONTRIBUTING.md)

---

**Last Updated**: 2025-10-29  
**Version**: 1.0

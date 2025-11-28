# Support

## Getting Help

If you need help with Prisma Glow, there are several ways to get support:

### Documentation

First, check our comprehensive documentation:
- [README.md](README.md) - Getting started guide
- [docs/architecture.md](docs/architecture.md) - System architecture
- [docs/release-runbook.md](docs/release-runbook.md) - Deployment procedures
- [docs/](docs/) - Full documentation directory
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - Development guidelines

### Issue Tracker

For bug reports, feature requests, and technical questions:

1. **Search existing issues**: Check if your question has already been answered
   - [Open Issues](https://github.com/ikanisa/prisma/issues)
   - [Closed Issues](https://github.com/ikanisa/prisma/issues?q=is%3Aissue+is%3Aclosed)

2. **Create a new issue**: If you can't find an answer, open a new issue
   - [Report a Bug](https://github.com/ikanisa/prisma/issues/new?template=bug_report.md)
   - [Request a Feature](https://github.com/ikanisa/prisma/issues/new?template=feature_request.md)
   - [Ask a Question](https://github.com/ikanisa/prisma/issues/new?template=question.md)

### Communication Channels

- **GitHub Discussions**: For general questions and community discussions
  - [Start a Discussion](https://github.com/ikanisa/prisma/discussions)

- **Slack** (for team members): Join #prisma-glow channel
  - Development questions: #engineering
  - Operations issues: #oncall
  - Incidents: #incidents

### Security Issues

**DO NOT** report security vulnerabilities via public GitHub issues.

Instead, follow our security reporting process:
- See [SECURITY.md](SECURITY.md) for detailed instructions
- Email: security@prismaglow.com (if configured)
- Use GitHub Security Advisories (private disclosure)

## Support Scope

### What We Support

✅ **We provide support for**:
- Installation and setup issues
- Bug reports with reproducible steps
- Feature requests with clear use cases
- Documentation clarifications
- Development environment setup
- CI/CD pipeline issues
- Deployment problems

### What We Don't Support

❌ **We don't provide support for**:
- Custom modifications to the codebase
- Third-party integrations not documented
- Infrastructure issues outside our control (AWS, GCP, Azure)
- General programming questions
- Issues with outdated versions (please upgrade first)

## Response Times

Our support response times depend on the severity of the issue:

| Severity | Description | First Response | Resolution Target |
|----------|-------------|----------------|-------------------|
| **Critical** | Production down, data loss | < 1 hour | < 4 hours |
| **High** | Major feature broken | < 4 hours | < 24 hours |
| **Medium** | Minor feature issue, workaround exists | < 24 hours | < 1 week |
| **Low** | Questions, feature requests | < 3 days | Best effort |

**Note**: Response times apply during business hours (Monday-Friday, 9:00-17:00 UTC). Critical issues receive 24/7 support.

## Before Asking for Help

To get faster support, please:

1. **Check the documentation** - Most common questions are already answered
2. **Search existing issues** - Your question may have already been addressed
3. **Provide context** - Include version numbers, error messages, and steps to reproduce
4. **Minimal reproducible example** - Simplify the problem to the smallest possible case
5. **Environment details** - OS, Node version, pnpm version, browser (if relevant)

### Information to Include in Bug Reports

When reporting bugs, please include:

- **Version**: Which version of Prisma Glow are you using?
  - Check with: `git describe --tags --always`
  - Or check the version API: `curl https://your-instance.com/api/version`

- **Environment**:
  - Operating System (e.g., Ubuntu 22.04, macOS 14.2)
  - Node.js version: `node --version`
  - pnpm version: `pnpm --version`
  - Python version: `python --version`
  - Browser (if UI issue): Chrome 120, Firefox 121, etc.

- **Steps to reproduce**:
  1. First step
  2. Second step
  3. What went wrong

- **Expected behavior**: What should have happened?

- **Actual behavior**: What actually happened?

- **Logs and errors**: Include relevant error messages
  - Application logs: `docker compose logs`
  - Browser console errors (F12 → Console tab)
  - Server errors: Check Sentry or log files

- **Screenshots**: If the issue is visual, include screenshots

## Contributing

If you'd like to contribute code or documentation:
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- Join the discussion in [GitHub Discussions](https://github.com/ikanisa/prisma/discussions)

## Commercial Support

For enterprise support, SLA guarantees, and custom development:
- Contact: support@prismaglow.com (if configured)
- Website: https://prismaglow.com/support (if available)

## Community

Stay connected with the Prisma Glow community:
- GitHub: https://github.com/ikanisa/prisma
- Documentation: [docs/](docs/)
- Release Notes: [CHANGELOG.md](CHANGELOG.md)

## Acknowledgments

We appreciate your patience and understanding. Our goal is to provide excellent support while maintaining focus on product development.

Thank you for using Prisma Glow! 🚀

---

**Last Updated**: 2025-10-29  
**Maintained By**: Support Team

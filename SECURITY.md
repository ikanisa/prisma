# Security Policy

## Table of Contents
- [Reporting a Vulnerability](#reporting-a-vulnerability)
- [Supported Versions](#supported-versions)
- [Security Update Process](#security-update-process)
- [Secrets Management](#secrets-management)
- [OAuth Scopes](#oauth-scopes)
- [Dependency Policy](#dependency-policy)
- [Recommended Tools](#recommended-tools)
- [Access Controls](#access-controls)

## Reporting a Vulnerability

**We take security vulnerabilities seriously.** If you discover a security issue, please report it responsibly.

### Reporting Channels

1. **GitHub Security Advisories** (Preferred):
   - Navigate to: https://github.com/ikanisa/prisma/security/advisories/new
   - Click "Report a vulnerability"
   - Provide detailed information

2. **Email**:
   - Send to: **security@prismaglow.com**
   - Use PGP encryption if possible: [Public Key TBD]

3. **Private Disclosure**:
   - Do NOT create public GitHub issues for security vulnerabilities
   - Do NOT share exploit details publicly until a fix is available

### What to Include

Please provide:

- **Description**: Clear explanation of the vulnerability
- **Type**: SQL injection, XSS, CSRF, authentication bypass, etc.
- **Impact**: What can an attacker achieve?
- **Reproduction**: Step-by-step instructions
- **Affected Components**: Services, files, or endpoints
- **Proof of Concept**: Code, screenshots, or video (if available)
- **Suggested Fix**: If you have a recommendation
- **Disclosure Timeline**: Your preferred disclosure date

### Our Commitment

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Status Updates**: Weekly via email
- **Fixes**: Based on severity (see below)
- **Credit**: We'll acknowledge your contribution (unless you prefer anonymity)
- **CVE Assignment**: We'll request a CVE if warranted

### Response Timeline

| Severity | Initial Response | Fix Target | Disclosure |
|----------|------------------|------------|------------|
| **Critical** (S0) | 4 hours | 24 hours | 7 days after fix |
| **High** (S1) | 1 business day | 7 days | 14 days after fix |
| **Medium** (S2) | 3 business days | 30 days | 30 days after fix |
| **Low** (S3) | 1 week | 90 days | 90 days after fix |

### Coordinated Disclosure

We follow a coordinated disclosure process:

1. **Acknowledgment**: We acknowledge your report
2. **Validation**: We validate and assess severity
3. **Fix Development**: We develop and test a fix
4. **Notification**: We notify affected users (if applicable)
5. **Release**: We release the fix
6. **Disclosure**: We publish a security advisory
7. **Credit**: We credit the reporter (if desired)

We kindly request **90 days** before public disclosure to allow time for fixes and user updates.

### Bug Bounty Program

We're evaluating a bug bounty program. For now, we offer:
- Public recognition in our security hall of fame
- Swag for significant findings
- Commercial support credit (for enterprise customers)

Contact **security@prismaglow.com** for details.

## Supported Versions

| Version | Supported | Notes |
|---------|-----------|-------|
| main branch | ✅ Yes | Active development |
| v1.x.x (latest) | ✅ Yes | Production releases |
| < v1.0.0 | ❌ No | Pre-release, not supported |

We support the latest major version and provide security updates for critical issues only in the previous major version (for 6 months after new major release).

## Security Update Process

### For Critical Security Updates (S0)

1. **Immediate Notification**: Via email and GitHub Security Advisory
2. **Hotfix Release**: Within 24 hours
3. **Rollout**: Coordinated deployment to all environments
4. **Verification**: Post-deployment security validation
5. **Post-Mortem**: Incident review and preventive measures

### For Other Security Updates

- Security fixes included in regular releases
- Documented in CHANGELOG.md and release notes
- GitHub Security Advisory published after fix is available
- Users notified via release notifications

## Secrets Management
- Store all API keys (Supabase, OpenAI, Google) in an encrypted secret manager or environment vault.
- Never commit real keys to Git; rotate any exposed keys immediately.
- Use `.env.example` to document required variables without values.
- Run `gitleaks` in CI to detect accidental leaks.
- HashiCorp Vault integration is available via `lib/secrets/*` and `supabase/functions/_shared/supabase-client.ts`; configure `VAULT_ADDR`, `VAULT_TOKEN`, and `SUPABASE_VAULT_PATH` to source Supabase credentials centrally.
- Signed URL TTLs are enforced via `lib/security/signed-url-policy.ts`, keeping evidence/document links short-lived and redacting PII in manifests.

## OAuth Scopes
- **Google Sheets**: limit to `https://www.googleapis.com/auth/spreadsheets` and use service accounts where possible.
- **OpenAI**: use API keys with minimal permissions and enforce usage caps.
- Configure `OPENAI_RPM` to cap embed requests per minute.
- Maintain the full catalogue and rotation steps in `docs/SECURITY/oauth-scopes.md`.

## Dependency Policy
- Maintain `package.json` and lock files under version control.
- Generate SBOM with `cyclonedx-npm` and run `npm audit --omit=dev` in CI.
- Enable Dependabot or Renovate for automated updates.
- Run Snyk in CI for deep dependency scanning.

## Recommended Tools
- **Secret scanning**: `gitleaks`
- **Static analysis**: `eslint`, `typescript`
- **Dependency scanning**: `npm audit`, Snyk
- **Runtime monitoring**: Supabase logs, telemetry dashboards
- **Access controls**: Supabase RLS

## Access Controls
- Supabase row level security policies protect tenant data.
- Services should validate user roles as documented in `docs/access-control.md`.
- Detailed table-by-table policies are catalogued in `docs/SECURITY/rls-policies.md` and
  validated via `scripts/test_policies.sql`.

### Storage Buckets (Documents)
- The `documents` storage bucket is private and enforced via RLS on `storage.objects`.
- Only the service role may write to `documents`; authenticated users may read objects
  only when they belong to the owning organisation (bucket path prefix `org-<org_id>`).
- See migration `supabase/migrations/20250927100000_documents_storage_policy.sql` for
  the policy definitions, and prefer signed URLs for any download flows.

## HTTP Security Headers
- The FastAPI gateway injects strict security headers, including a `Content-Security-Policy`
  that blocks `unsafe-*` directives and restricts connections to the API origin plus the
  configured Supabase project. Adjustments can be supplied through
  `CSP_ADDITIONAL_CONNECT_SRC` / `CSP_ADDITIONAL_IMG_SRC` environment variables when external
  services are required.
- Cross-origin requests are limited to the values provided through `API_ALLOWED_ORIGINS`.
  Set this list explicitly in production (for example `https://app.prismaglow.example.com`) and define
  `ENVIRONMENT=production` to prevent fallback behaviour. Development/test environments fall
  back to localhost origins for convenience.

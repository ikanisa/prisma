# Security Guidelines

## Table of Contents
- [Secrets Management](#secrets-management)
- [OAuth Scopes](#oauth-scopes)
- [Dependency Policy](#dependency-policy)
- [Recommended Tools](#recommended-tools)
- [Access Controls](#access-controls)

## Secrets Management
- Store all API keys (Supabase, OpenAI, Google) in a managed secret store or n8n credentials.
- Never commit real keys to Git; rotate any exposed keys immediately.
- Use `.env.example` to document required variables without values.
- Run `gitleaks` in CI to detect accidental leaks.

## OAuth Scopes
- **Google Sheets**: limit to `https://www.googleapis.com/auth/spreadsheets` and use service accounts where possible.
- **OpenAI**: use API keys with minimal permissions and enforce usage caps.
- Configure `OPENAI_RPM` to cap embed requests per minute.

## Dependency Policy
- Maintain `package.json` and lock files under version control.
- Generate SBOM with `cyclonedx-npm` and run `npm audit --omit=dev` in CI.
- Enable Dependabot or Renovate for automated updates.
- Run Snyk in CI for deep dependency scanning.

## Recommended Tools
- **Secret scanning**: `gitleaks`
- **Static analysis**: `eslint`, `typescript`
- **Dependency scanning**: `npm audit`, Snyk
- **Runtime monitoring**: n8n error workflow, Supabase logs
- **Access controls**: Supabase RLS

## Access Controls
- Supabase row level security policies protect tenant data.
- Services should validate user roles as documented in `docs/access-control.md`.


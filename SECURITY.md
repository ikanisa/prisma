# Security Guidelines

## Table of Contents
- [Secrets Management](#secrets-management)
- [OAuth Scopes](#oauth-scopes)
- [Dependency Policy](#dependency-policy)
- [Recommended Tools](#recommended-tools)
- [Access Controls](#access-controls)

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
  Set this list explicitly in production (for example `https://app.prisma-cpa.vercel.app`) and define
  `ENVIRONMENT=production` to prevent fallback behaviour. Development/test environments fall
  back to localhost origins for convenience.

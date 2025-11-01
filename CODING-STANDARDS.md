# Coding Standards

## Languages & Tooling
- **TypeScript:** Strict mode enabled (`tsconfig.base.json`); no `any` without justification.
- **React/Next PWAs:** Functional components with hooks; avoid legacy class components.
- **Prisma:** Use generated client with explicit types; migrations via `pnpm run db:migrate`.
- **Styling:** Tailwind and CSS modules permitted; enforce design tokens from `packages/ui`.
- **Testing:** Vitest/Playwright with coverage thresholds ≥85% lines, ≥80% branches.

## Source Control
- Conventional Commits (`type(scope): summary`).
- Feature branches from `main`; rebase before merge.
- Signed commits required (`git config commit.gpgsign true`).
- CODEOWNERS reviews mandatory for security, ledger, agents directories.

## Type Safety
- Enable `noImplicitAny`, `strictNullChecks`, `exactOptionalPropertyTypes`.
- Prefer discriminated unions for workflow states.
- Shared finance types live in `packages/types-finance`; import rather than redeclare.

## Security Practices
- Never interpolate SQL strings; use parameterized queries or Prisma.
- Sanitize and validate all external inputs with Zod/AJV.
- Use `helmet` for secure headers; configure CSP per environment.
- Access tokens stored in HttpOnly Secure cookies; avoid localStorage for secrets.

## Performance & PWA
- Implement code splitting with dynamic imports in PWAs.
- Observe bundle budgets (main ≤ 300KB gz, async chunk ≤ 250KB gz).
- Use React Query/SWR cache for network efficiency with TTL tagging.
- Service worker strategies follow `pwa-offline-sync-checklist.md`.

## Observability
- Emit structured logs with `{ trace_id, user_id, tenant_id }` for server actions.
- Instrument key flows with OpenTelemetry spans.
- Guard high-cardinality metrics; aggregate before exporting.

## Review Checklist
Before merging, confirm:
1. Tests and linters pass locally and in CI.
2. Documentation updated (READMEs, ADRs, runbooks).
3. Security/privacy impacts reviewed.
4. Rollback strategy identified (feature flag, revert plan, or migration rollback).

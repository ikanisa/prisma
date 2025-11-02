# Web bundle optimization – November 2025

This note captures the bundle profiling pass for the Next.js app (`apps/web`) and the follow-up work to enforce budgets.

## Tooling

* Re-enabled the `@next/bundle-analyzer` plugin and produced fresh stats via `pnpm --filter web bundle:check`, which now skips type checking and linting during analyze runs while providing stubbed Supabase/OpenAI credentials for deterministic builds.
* Added `config/web-bundle-budgets.json` and the helper script `tools/check-next-bundle.mjs`; CI can execute `pnpm --filter web bundle:check` or the root alias `pnpm check:bundle:web` to validate budgets.

## Key findings

The heaviest initial entrypoints remain the shared layout/runtime bundles, followed by the Supabase auth demo and the three agent dashboards. The analyzer highlights two large vendor chunks:

* `static/chunks/6232-415c5cf8502d0134.js` – dominated by `@tanstack/query-core` primitives that feed the dashboard/task surfaces.【F:apps/web/.next/analyze/client.json†L1-L12】【F:apps/web/src/features/agents/components/agent-task-list.tsx†L1-L200】
* `static/chunks/1649-5f25a90744abd444.js` – Supabase client modules (`postgrest-js`, `supabase-js`) required by the auth playground and finance review flows.【F:apps/web/.next/analyze/client.json†L1-L12】【F:apps/web/app/style-guide/supabase-auth/page.tsx†L1-L23】

Lazy loading the dashboard widgets (`AgentTaskList`, `DocumentGrid`) trims the dashboard entry to ~8.7&nbsp;kB gzip, keeping the core navigation bundle under 10&nbsp;kB.【F:apps/web/app/dashboard/page.tsx†L1-L120】 Memoized helpers in those widgets and the organization hooks prevent avoidable re-renders, keeping runtime costs low.【F:apps/web/src/features/agents/components/agent-task-list.tsx†L1-L200】【F:apps/web/src/hooks/use-organizations.ts†L1-L200】

## Entry budgets (gzip)

| Entry | Size | Budget |
| --- | ---: | ---: |
| `app/layout` | 127.88&nbsp;kB | 135.00&nbsp;kB |
| `main-app` | 85.43&nbsp;kB | 90.00&nbsp;kB |
| `main` | 81.95&nbsp;kB | 86.00&nbsp;kB |
| `app/style-guide/supabase-auth/page` | 47.03&nbsp;kB | 52.00&nbsp;kB |
| `app/agent/domain-tools/page` | 26.41&nbsp;kB | 29.00&nbsp;kB |
| `app/agent/tasks/page` | 26.33&nbsp;kB | 29.00&nbsp;kB |
| `app/dashboard/page` | 8.73&nbsp;kB | 10.50&nbsp;kB |
| `pages/reporting/*` | 3.06–3.08&nbsp;kB | 5.00&nbsp;kB |

Full thresholds live in `config/web-bundle-budgets.json` and are enforced by the bundle check script.【F:config/web-bundle-budgets.json†L1-L46】【F:tools/check-next-bundle.mjs†L1-L82】 The latest analyzer run passed with all entries under their ceilings.【77e51a†L1-L171】

## Next steps

* Monitor the shared vendor chunks (`@tanstack/query-core`, Supabase) for further splitting opportunities (e.g., per-route modules or API-layer facades).
* Wire the new `bundle` pipeline into CI so regressions block merges alongside lint/test.
* Extend the docs with Lighthouse snapshots once UI regressions are validated.

# easyMO Admin App

This directory contains the additive-only admin panel scaffold for the easyMO / Kwigira platform. The goal of this first iteration is to provide a theme-aware shell, navigation scaffolding, and authenticated layout that future phases will extend with data access, actions, and integrations.

## Getting Started

```bash
cd admin-app
npm install
npm run dev
```

Then open `http://localhost:3000`. You will see placeholder routes for:

- `/dashboard`
- `/users`
- `/insurance`
- `/vouchers`
- `/campaigns`
- `/stations`
- `/files`
- `/settings`
- `/logs`

Each screen currently renders a descriptive stub. Navigation and theming already work, so follow-up tasks can focus on wiring typed data clients and UI widgets without reworking the shell.

If you have Supabase credentials available for the admin surface, expose them as environment variables before running `npm run dev`:

```bash
export ADMIN_SUPABASE_URL=https://<project>.supabase.co
export ADMIN_SUPABASE_SERVICE_ROLE_KEY=<service-role>
```

Without these variables the interface automatically falls back to rich mock data (see `lib/mock-data.ts`).

## Architecture Notes

- **Next.js App Router** (Next 14) to take advantage of nested layouts and streaming data in later phases.
- **ThemeProvider** stores the theme in `localStorage` and toggles `data-theme` on `<html>` for instantly switchable light/dark palettes.
- **AuthGate** is a placeholder that always renders children today. Swap it with Supabase auth checks when the backend contract is ready.
- **ShellLayout** composes the persistent sidebar, top bar, and content area. The layout lives under `app/(app)/layout.tsx`, keeping root layout minimal.
- **Typed data service** (`lib/schemas.ts`, `lib/data-service.ts`) wraps Supabase queries with Zod validation and mock fallbacks to keep downstream components deterministic during early development.
- **Virtualized DataTable** (`components/DataTable.tsx`) provides search, CSV export, and basic paging hooks for datasets up to thousands of rows; users, vouchers, and campaigns consume it. Additional entity pages (insurance, logs) should reuse the same widget in future phases.
- **Virtualized DataTable** (`components/DataTable.tsx`) provides search, CSV export, and basic paging hooks for datasets up to thousands of rows; users, vouchers, campaigns, stations, and insurance quotes consume it.
- **Admin API routes** start under `app/api/v1/`: `/api/v1/vouchers`, `/api/v1/users`, `/api/v1/campaigns`, `/api/v1/stations`, and `/api/v1/insurance` already proxy to the data service with Zod validation. Future routes should follow the same pattern (typed schemas + mock/Supabase fallback).
- **No Forbidden Paths Touched:** the admin shell is isolated under `admin-app/` and interacts with the rest of the monorepo only via shared Git history.

## Next Steps

1. Implement typed data clients and mock adapters (Task T1).
2. Introduce reusable DataTable and KPI widgets (Tasks T2–T3).
3. Replace `AuthGate` with real authentication once the admin API is in place.
4. Extend the DataTable into a fully shared widget (server-driven pagination/filters) and adopt it on other entity pages (campaigns, insurance, logs), including total counts + pager controls tied to Admin API routes.
5. Stand up Admin API route handlers for read operations so pages can stop querying Supabase directly (vouchers/users/campaigns first, then logs and insurance) and reuse validation in `lib/schemas.ts`.
6. Add storybook or visual regression tooling if desired (optional).

Until then, this scaffold provides the structural baseline for subsequent phases.

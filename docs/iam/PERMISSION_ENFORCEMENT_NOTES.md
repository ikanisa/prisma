# IAM-2 Permission Guard Notes

This note describes how the IAM-2 permission matrix integrates with the FastAPI gateway and UI so every protected action validates organization scope and minimum role.

## Backend Enforcement

1. **Permission Map Loader** — `server/main.py` loads `POLICY/permissions.json` at startup. Each permission key (e.g. `accounting.close.lock`) maps to the minimum role required.
2. **Helper API** — `ensure_permission_for_role` uses the existing role hierarchy to compare the caller’s role against the map. `SYSTEM_ADMIN` is always allowed.
3. **Endpoint Guards**:
   - Documents: `/v1/storage/documents` enforces `documents.internal.list` and automatically constrains CLIENT users to the PBC whitelisted repositories.
   - Upload/delete/restore document routes honour `documents.internal.*` permissions while allowing CLIENT uploads to PBC folders only.
    - IAM administration routes (`/api/iam/*`) now depend on `admin.members.*` and `admin.invites.revoke` permissions.
    - Signed URL and extraction hooks apply `documents.internal.link` so CLIENT users cannot generate internal links unless scoped to PBC entries.
    - Step-up helper `require_recent_whatsapp_mfa` blocks close period locks and similar privileged actions when no verified code exists within the previous 24 hours.
    - Admin console endpoints (`/api/admin/*`) enforce `admin.org.settings*`, `admin.auditlog.view`, and `admin.impersonation.*` thresholds before touching Supabase tables.
4. **Shared membership lookup** — `resolve_org_context` (slug-based) and `ensure_org_access_by_id` (ID-based) both surface the caller role which feeds the helper above.
5. **Edge functions** — the accounting-close edge function now uses the expanded `org_role` enum with ranks consistent with the permission matrix (MANAGER vs PARTNER lock thresholds) and demands `requireRecentMfa` on lock requests.

## Frontend Enforcement

- `useOrganizations` exposes `currentRole` and a generalized `hasRole` check using the same hierarchy, so components can hide or disable UI affordances.
- Documents page disables archive/restore for sub-manager roles and routes CLIENT uploads to the whitelisted PBC repository; tooltips communicate “Requires Manager or above” when actions are disabled.
- Admin pages already rely on `ProtectedRoute requiredRole="MANAGER"`; buttons with elevated requirements now reference `hasRole` to gate inline controls.

## Usage Guidance

- When adding new endpoints, pick a permission key in `POLICY/permissions.json` and call `ensure_permission` early in the handler (after resolving `orgSlug` / `orgId`).
- UI components that should disappear for certain roles should call `hasRole` or compare `currentRole` and optionally surface the reason in a tooltip.
- Keep the JSON map authoritative — any new permission should be documented there with matching hints in release notes.

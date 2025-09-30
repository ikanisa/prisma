# IAM-1 User Management Overview

The IAM-1 deliverable introduces a unified organization directory with hierarchical roles, invitations, and team management. This document captures the key API surfaces, UI entry points, and operational notes required to run the module in production.

## API Endpoints

| Endpoint | Method | Description | Role Guard |
| --- | --- | --- | --- |
| `/api/iam/org/create` | POST | Create a new organization (name, slug, autopilot level). Automatically seeds creator as `SYSTEM_ADMIN`. | `SYSTEM_ADMIN` |
| `/api/iam/members/list?orgId=<uuid>` | GET | Returns members (with profiles), teams, and invites for the organization. | `MANAGER` + |
| `/api/iam/members/invite` | POST | Issues an invite token (email/phone + target role). Stores SHA-256 token hash. | `MANAGER` + |
| `/api/iam/members/revoke-invite` | POST | Marks a pending invite as `REVOKED`. | `MANAGER` + |
| `/api/iam/members/accept` | POST | Public endpoint consuming invite token; upserts `user_profiles` and `memberships`. | Public (token) |
| `/api/iam/members/update-role` | POST | Changes member role with guard against demoting the final manager/partner. | `MANAGER` + |
| `/api/iam/profile/get` | GET | Returns the caller profile and (optional) org preferences. | Self |
| `/api/iam/profile/update` | POST | Updates `user_profiles` and per-org preferences (theme, notifications). Requires an `orgId`. | Self |
| `/api/iam/teams/create` | POST | Creates a team (name, description). | `MANAGER` + |
| `/api/iam/teams/add-member` | POST | Adds/updates a team membership with role (`LEAD`/`MEMBER`/`VIEWER`). | `MANAGER` + |
| `/api/iam/teams/remove-member` | POST | Removes a user from a team. | `MANAGER` + |

All endpoints log ActivityLog events with module `IAM` (`ORG_CREATED`, `INVITE_SENT`, `INVITE_ACCEPTED`, `INVITE_REVOKED`, `MEMBERSHIP_ROLE_CHANGED`, `TEAM_CREATED`, `TEAM_MEMBER_ADDED`, `TEAM_MEMBER_REMOVED`, `PROFILE_UPDATED`).

## Permission Matrix

- `POLICY/permissions.json` holds the canonical mapping of actions to minimum roles (e.g. `accounting.close.lock → PARTNER`).
- `server/main.py` loads the file at startup and applies `ensure_permission_for_role` before serving IAM, document, and admin routes.
- Client components consume the same hierarchy through `useOrganizations.hasRole` and hide controls the caller cannot execute.

## Data Model Highlights

- `public.user_profiles` mirrors auth users, enforcing `citext` email uniqueness and tracking locale/timezone and WhatsApp metadata.
- `public.memberships.role` now uses the `public.org_role` enum with precedence matching `POLICY/roles.md`.
- `public.invites` persists hashed tokens, invitor, and expiry timestamps with RLS requiring `has_min_role(org_id, 'MANAGER')` for writes.
- `public.teams` / `public.team_memberships` enforce RLS via `public.is_member_of` joins.

## Admin UI (React)

- `/[orgSlug]/admin`: consolidated admin console with tabs for Settings, Users, Teams, Audit Log, and Impersonation (`src/pages/admin/index.tsx`).
- `/[orgSlug]/admin/users`: members table, inline role changes, invite issuance, and pending invite management with revoke support (`src/pages/admin/users.tsx`).
- `/[orgSlug]/admin/teams`: team overview, creation workflow, and member assignments (`src/pages/admin/teams.tsx`).
- Settings → Security now surfaces WhatsApp MFA linking (`src/components/settings/whatsapp-mfa-card.tsx`). Sensitive workflows surface an inline modal (e.g. accounting close lock) that prompts for verification when required.

Both pages rely on `src/lib/iam.ts` helpers wrapping the API endpoints and respect the `ProtectedRoute` guard (`MANAGER` minimum).

## Operational Notes

- Invites expire after 14 days by default. Extend/override by passing `expiresAt` in the invite payload.
- Role upgrades to `SYSTEM_ADMIN` require an actor already holding `SYSTEM_ADMIN`.
- Demoting the final manager or partner returns HTTP 409, preserving the segregation of duties control.
- ActivityLog writes are idempotent; failures are logged to structured logs (`activity.log_failed`). Monitor `activity_log_action_idx` for ingestion health.
- WhatsApp MFA challenges live in `mfa_challenges`. OTP codes expire after five minutes, resend is limited to once per minute, and three failed attempts introduce a ten-minute lockout. Step-up enforcement checks for a consumed challenge within the last 24 hours.
- Impersonation grants are stored in `impersonation_grants`. Requests require MANAGER+, approvals require a second approver, and revocations deactivate the grant. Use `IMPERSONATION_REQUESTED/GRANTED/REVOKED` ActivityLog events as evidence.

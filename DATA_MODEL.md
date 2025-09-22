# Data Model

## Table of Contents
- [Supabase Schema](#supabase-schema)
- [Google Sheets](#google-sheets)

## Supabase Schema
The following tables are defined in migrations:

| Table | Key Columns | Description |
|---|---|---|
| `users` | `id` (PK, FK auth.users) | Profile for each auth user |
| `organizations` | `id` (PK) | Tenant organizations |
| `memberships` | `id` (PK), (`org_id`,`user_id`) unique | Links users to organizations with role |
| `clients` | `id` (PK), `org_id` FK | Client records |
| `engagements` | `id` (PK), `org_id`, `client_id` FKs | Projects/engagements per client |
| `tasks` | `id` (PK), `org_id`, `engagement_id` FKs | Work items assigned to users |
| `documents` | `id` (PK), `org_id` FK | File metadata |
| `notifications` | `id` (PK), `user_id` FK | User notifications |
| `activity_log` | `id` (PK), `user_id` FK | Audit log of user actions |

Row Level Security is enabled on all tables with helper functions `is_member_of` and `has_min_role` for access checks.

## Google Sheets
No schemas were found in the repository. Define tabs/columns and primary keys before production use. Suggested tabs:
- `n8n_state` (idempotency keys, processed flags)
- `tasks` (task exports)
- `clients` (client registry)


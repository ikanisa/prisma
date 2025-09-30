# Aurora IAM Role Hierarchy

| Role | Precedence | Description |
| --- | --- | --- |
| SYSTEM_ADMIN | 100 | Global administrators with cross-organization privileges, onboarding responsibility, and ability to override guardrails under break-glass controls. |
| PARTNER | 90 | Engagement leaders authorised to approve report release, lock accounting periods, and sponsor high-risk actions. |
| MANAGER | 70 | Operational managers with authority to invite users, manage teams, approve tasks/documents, and configure org-level settings. |
| EMPLOYEE | 50 | Internal contributors with access to core workflow artefacts (tasks, documents, knowledge) for their organization. |
| CLIENT | 40 | External client contacts restricted to designated portal scopes (PBC uploads, assigned requests). |
| READONLY | 30 | View-only role for auditors/partners observing progress without edit rights. |
| SERVICE_ACCOUNT | 20 | Programmatic accounts used for automation; access constrained via scoped policies. |
| EQR (flag) | — | Engagement Quality Reviewer flag applied in addition to base role; enables TCWG/EQR approval steps while inheriting MANAGER-level base permissions. |

## Role Inheritance & Rules

- Roles inherit permissions from lower-precedence entries (e.g. MANAGER includes EMPLOYEE capabilities).
- SYSTEM_ADMIN actions always require explicit audit logging with justification.
- EQR flag is stored alongside the member's base role and must be included in ActivityLog metadata for approvals.
- CLIENT accounts are excluded from internal activity feeds, knowledge bases, and analytics dashboards by default.
- SERVICE_ACCOUNT roles require signed automation policies and are denied interactive UI access.

## Activity Logging Requirements

Every material IAM action must emit an `activity_log` entry including:
- `action`: `ORG_CREATED`, `INVITE_SENT`, `INVITE_ACCEPTED`, `INVITE_REVOKED`, `MEMBERSHIP_ROLE_CHANGED`, `TEAM_CREATED`, `TEAM_MEMBER_ADDED`, `TEAM_MEMBER_REMOVED`, `ORG_SETTINGS_UPDATED`, `IMPERSONATION_REQUESTED`, `IMPERSONATION_GRANTED`, `IMPERSONATION_REVOKED`.
- `org_id`: affected organization.
- `user_id`: actor performing the action (for invites, the inviter; for acceptances, the invitee).
- `metadata`: JSON payload capturing `target_user_id`, `team_id`, `invite_id`, or relevant context.

## Guardrails

- Do not allow downgrading the final MANAGER or PARTNER within an organization.
- Invites must expire within 14 days and store `token_hash` only (never raw tokens).
- Inserts/updates into IAM tables require `has_min_role(org_id, 'EMPLOYEE')`; role administration requires `MANAGER` or higher.
- All IAM APIs must validate org-scoped membership prior to touching Supabase tables to maintain defence-in-depth with RLS.
- Permission thresholds for backend/UI are centralised in `POLICY/permissions.json`; update that file when introducing new protected actions.

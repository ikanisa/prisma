# Group Audit Governance Policy

## Purpose
This policy governs the GRP1 group audit workflow covering component scoping, instruction
communications, workpaper intake, and review sign-offs. It supplements existing engagement
controls and aligns the platform with ISA 600 oversight requirements.

## Scope
- Supabase tables `group_components`, `group_instructions`, `component_workpapers`, and
  `component_reviews` deployed via `supabase/sql/audit_GRP1_schema.sql`.
- Next.js API endpoints under `/api/group/*` that coordinate CRUD, acknowledgements, and
  review sign-offs.
- Client dashboard at `/audit/group` which visualises the heatmap, instruction tracker, and
  review queue, with links into the client portal uploads.

## Roles and Responsibilities
| Role | Responsibilities |
| --- | --- |
| Group engagement partner / manager | Create and update component definitions, issue instructions, assign reviewers, and monitor completion status. |
| Component team leads | Acknowledge instructions, upload workpapers, and respond to status updates. |
| Reviewers / EQCR | Complete component review notes, record sign-off status, and escalate overdue items. |
| System administrators | Manage Supabase RLS helpers, rotate keys, and audit GRP_* activity logs. |

All write operations require authenticated service calls supplying both the organisation UUID
(`orgId`) and acting user UUID (`userId`). The Next.js handlers enforce this context before
modifying state or emitting audit activity entries.

## Data Controls
- **group_components**: Captures component code, jurisdiction, risk, status, and materiality
  scope. RLS allows only managers (or higher) to create, update, or delete records.
- **group_instructions**: Records the instruction text, due dates, sender, and acknowledgement
  metadata. Managers issue instructions; any member can acknowledge, but the policy enforces that
  the `acknowledged_by` column matches the acting user.
- **component_workpapers**: Stores ingestion metadata linking back to instructions and documents.
  Members can submit or amend their own uploads; managerial overrides remain available for
  remediation.
- **component_reviews**: Tracks reviewer assignments, due dates, and sign-off timestamps. Managers
  create/delete reviews, while assigned reviewers may update their own records.

Row-level security leverages the existing `public.is_member_of` and `public.has_min_role` helpers
and is declared in the GRP1 schema file to keep multi-tenant boundaries intact.

## Activity Logging
Every mutating endpoint writes a structured record to `activity_log` using GRP-specific actions:
- `GRP_COMPONENT_CREATED`, `GRP_COMPONENT_UPDATED`, `GRP_COMPONENT_DELETED`
- `GRP_INSTRUCTION_SENT`, `GRP_INSTRUCTION_ACK`
- `GRP_WORKPAPER_INGESTED`
- `GRP_REVIEW_ASSIGNED`, `GRP_REVIEW_SIGNOFF`

The metadata payload includes the affected entity identifier plus status/risk context so internal
audit can reconstruct timelines without direct table access.

## API Contracts
| Endpoint | Method(s) | Purpose |
| --- | --- | --- |
| `/api/group/components` | `GET`, `POST` | List or create group components. |
| `/api/group/components/{id}` | `GET`, `PATCH`, `DELETE` | Read or maintain a specific component. |
| `/api/group/instructions` | `GET`, `POST` | Publish instructions and monitor acknowledgement status. |
| `/api/group/instructions/{id}/ack` | `POST` | Record acknowledgement timestamp and actor. |
| `/api/group/workpapers` | `GET`, `POST` | Ingest component workpapers linked to instructions/documents. |
| `/api/group/reviews` | `GET`, `POST` | Assign or list component reviews. |
| `/api/group/reviews/{id}/signoff` | `POST` | Capture reviewer sign-off metadata. |

All responses return JSON payloads with camelCase properties suitable for the dashboard. Clients
must include the `orgId` (query or body) and `userId` (body or header) to satisfy validation and
support downstream logging.

## Monitoring and Escalation
- The dashboard highlights overdue instructions (due date passed without acknowledgement) and
  pending reviews (status not `signed_off`).
- API handlers bubble Supabase errors directly to the caller; clients should surface these
  alongside the dashboard status message to prompt remediation.
- Activity log entries must be reviewed alongside Supabase audit trails as part of the periodic
  ISA 600 governance review.

## Integration with Document Uploads
Document upload actions continue to route through `/client-portal`. The dashboard deep-links into
that portal by pre-populating `componentId` and, when available, `workpaperId` query parameters so
teams can attach evidence directly from the heatmap, instruction tracker, or review queue.

# Audit specialists workflow (EXP1)

This policy describes how EXP1 tracks expert-use assessments (ISA 620) and reliance on internal audit (ISA 610). It combines Supabase storage, API instrumentation, activity tracing, and an operator-facing workflow in the web app.

## Data model additions

The `supabase/sql/audit_EXP1_schema.sql` script introduces three tables governed by row-level security:

| Table | Purpose | Key columns |
| --- | --- | --- |
| `audit_specialist_experts` | Captures the ISA 620 evaluation of external specialists engaged by the firm. | `area`, `specialist_name`, `scope_of_work`, `competence_assessment`, `objectivity_assessment`, `results_summary`, `conclusion`, `status`, `standard_refs` (defaults to `ISA 620`). |
| `audit_specialist_internal` | Records ISA 610 conclusions on the internal audit function. | `reliance_area`, `scope_of_reliance`, `competence_evaluation`, `objectivity_evaluation`, `work_evaluation`, `risk_assessment`, `conclusion`, `status`, `standard_refs` (defaults to `ISA 610`). |
| `audit_specialist_evidence` | Links evidence artefacts to either an expert or internal audit evaluation. | `expert_assessment_id` **xor** `internal_assessment_id`, `document_id`/`evidence_url`, `description`, `notes`, `standard_refs`. |

The shared ENUM `audit_specialist_status` has three states (`draft`, `in_review`, `final`). RLS ensures:

* Only organisation members can read records.
* Managers (or the preparer) can update specialist records.
* Evidence can be created/edited by its uploader or organisation managers.

Each table uses `standard_refs` to embed traceability to ISA 620/610. Activity logging uses these references directly.

## API surface (`apps/web/app/api/specialists/*`)

| Endpoint | Method(s) | Description | Traceability |
| --- | --- | --- | --- |
| `/api/specialists` | `GET` | Returns expert/internal evaluations plus attached evidence for an `orgId`/`engagementId`. | Ensures `standard_refs` always include ISA 620/610. |
| `/api/specialists/experts` | `POST` | Creates an ISA 620 record. Requires `x-user-id`, `orgId`, `engagementId`. Emits `EXP_EXPERT_RECORDED`. | Metadata stores `status` and standards `['ISA 620', …]`. |
| `/api/specialists/experts/{id}` | `PUT` | Updates or concludes an expert record (`conclude: true`). Emits `EXP_EXPERT_UPDATED` / `EXP_EXPERT_CONCLUDED`. | Conclusion metadata carries the ISA 620 reference. |
| `/api/specialists/internal` | `POST` | Creates an ISA 610 reliance entry. Emits `EXP_INTERNAL_RECORDED`. | Standards default to `['ISA 610']`. |
| `/api/specialists/internal/{id}` | `PUT` | Updates or concludes an internal audit record. Emits `EXP_INTERNAL_UPDATED` / `EXP_INTERNAL_CONCLUDED`. | Metadata links engagement + standards. |
| `/api/specialists/evidence` | `POST` | Adds evidence tied to either specialist type. Emits `EXP_EVIDENCE_ATTACHED`. | `standard_refs` extend the underlying ISA standard. |
| `/api/specialists/evidence/{id}` | `PUT` | Updates evidence metadata (description, URLs, standards). Emits `EXP_EVIDENCE_UPDATED`. | Maintains ISA references for every attachment. |

All specialist endpoints require the acting Supabase user via `x-user-id`. Responses return the freshly written row to keep the UI in sync.

## Activity log events

Every change is mirrored in `activity_log` with `entity_type: "audit_specialist"` and the following actions:

* `EXP_EXPERT_RECORDED`
* `EXP_EXPERT_UPDATED`
* `EXP_EXPERT_CONCLUDED`
* `EXP_INTERNAL_RECORDED`
* `EXP_INTERNAL_UPDATED`
* `EXP_INTERNAL_CONCLUDED`
* `EXP_EVIDENCE_ATTACHED`
* `EXP_EVIDENCE_UPDATED`

Metadata for each event includes `engagementId`, `status` (where relevant), and `standards` so downstream reporting can map workpapers back to ISA 620/610 requirements.

## Web workflow (`/audit/specialists`)

The specialist dashboard exposes two cards:

1. **External expert (ISA 620)** – form fields for scope, competence, objectivity, work performed, results, conclusion, and status. Buttons support saving drafts or marking the conclusion. Evidence attachments are managed inline (add & edit) with automatic ISA 620 tagging.
2. **Internal audit reliance (ISA 610)** – mirror controls for reliance area, scope, evaluations, risk and conclusion. Evidence is handled identically but defaults to ISA 610.

Operators must supply the acting user, organisation, and engagement identifiers. Data loads via the `GET /api/specialists` endpoint. Each card includes a Markdown memo export that summarises evaluations plus evidence for archiving.

## Traceability checklist

* ISA 620 references flow through `standard_refs`, activity metadata, and memo exports for expert evaluations.
* ISA 610 references follow the same pattern for internal audit reliance.
* Evidence inherits the correct ISA reference automatically but accepts optional additional standards for jurisdictional overlays.
* All critical actions emit `EXP_*` activity entries to provide an immutable timeline for audit quality reviews.

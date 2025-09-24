# Endpoints and Workflows

## Table of Contents
- [Web Endpoints](#web-endpoints)
- [n8n Workflows](#n8n-workflows)

## Web Endpoints
| Method | Path | Auth | Description | Input Schema | Output Schema | Rate Limit | Idempotency |
|---|---|---|---|---|---|---|---|
| POST | `/functions/v1/seed-data` | Supabase service key | Seeds initial org/users/clients/tasks | n/a | JSON `{success, message}` | none | none |
| GET | `/functions/v1/audit-kam/list` | Supabase JWT | Lists KAM candidates, drafts, approvals (auto-seeds sources) | Query: `orgSlug`, `engagementId`, `seed?` | `{ candidates[], drafts[], approvals[], role }` | 60/min per user | auto |
| POST | `/functions/v1/audit-kam/candidate/add` | Supabase JWT | Adds a KAM candidate (manual or linked to risk/estimate/GC) | `{ orgSlug, engagementId, title, rationale?, source, riskId?, estimateId?, goingConcernId? }` | `{ candidate }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-kam/candidate/select` | Supabase JWT | Marks candidate as selected for drafting | `{ orgSlug, engagementId, candidateId, reason? }` | `{ candidate }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-kam/candidate/exclude` | Supabase JWT | Marks candidate as excluded | `{ orgSlug, engagementId, candidateId, reason? }` | `{ candidate }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-kam/draft/create` | Supabase JWT | Creates draft scaffold from selected candidate | `{ orgSlug, engagementId, candidateId, heading?, whyKam? }` | `{ draft }` | 20/min per user | n/a |
| POST | `/functions/v1/audit-kam/draft/update` | Supabase JWT | Updates draft narrative and references | `{ orgSlug, engagementId, draftId, heading?, whyKam?, howAddressed?, resultsSummary?, proceduresRefs?, evidenceRefs? }` | `{ draft }` | 60/min per user | n/a |
| POST | `/functions/v1/audit-kam/draft/submit` | Supabase JWT | Submits draft for approvals (queues manager/partner/EQR) | `{ orgSlug, engagementId, draftId }` | `{ draft }` | 10/min per user | n/a |
| GET | `/functions/v1/audit-kam/export` | Supabase JWT | Exports approved KAM drafts (`format=json|markdown`) | Query: `orgSlug`, `engagementId`, `format?` | `{ drafts[], count }` or `{ markdown, count }` | 20/min per user | auto |
| POST | `/functions/v1/audit-kam/approval/decide` | Supabase JWT | Records manager/partner/EQR approval or rejection | `{ orgSlug, engagementId, approvalId, decision, note? }` | `{ approvals[] }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-report/draft/create` | Supabase JWT | Creates audit report draft seeded with approved KAMs & GC flag | `{ orgSlug, engagementId }` | `{ report }` | 20/min per user | n/a |
| POST | `/functions/v1/audit-report/draft/update` | Supabase JWT | Updates report narrative and section toggles | `{ orgSlug, engagementId, reportId, ... }` | `{ report }` | 60/min per user | n/a |
| POST | `/functions/v1/audit-report/decision-tree` | Supabase JWT | Computes recommended opinion & required sections | `{ orgSlug, engagementId }` | `{ recommendedOpinion, reasons[], requiredSections[] }` | 20/min per user | auto |
| POST | `/functions/v1/audit-report/submit` | Supabase JWT | Submits report draft for approval queue | `{ orgSlug, engagementId, reportId }` | `{ report }` | 10/min per user | n/a |
| POST | `/functions/v1/audit-report/release` | Supabase JWT | Marks report as released after approvals | `{ orgSlug, engagementId, reportId }` | `{ report }` | 5/min per user | n/a |
| GET | `/functions/v1/audit-report/get` | Supabase JWT | Retrieves latest report draft and approvals | Query: `orgSlug`, `engagementId` | `{ report, approvals[] }` | 60/min per user | auto |
| POST | `/functions/v1/audit-report/export/pdf` | Supabase JWT | Renders current draft to PDF, stores in documents bucket | `{ orgSlug, engagementId, reportId }` | `{ documentId, path }` | 10/min per user | n/a |
| POST | `/functions/v1/audit-acceptance/background/run` | Supabase JWT | Save client background screening metadata | `{ orgSlug, clientId, screenings, riskRating, notes? }` | `{ backgroundCheckId }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-acceptance/independence/assess` | Supabase JWT | Record independence threats & safeguards | `{ orgSlug, clientId, threats[], safeguards[], conclusion }` | `{ assessmentId }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-acceptance/decision/submit` | Supabase JWT | Submit acceptance decision/EQR flag for Partner approval | `{ orgSlug, engagementId, decision, eqrRequired, rationale? }` | `{ decisionId, status }` | 10/min per user | n/a |
| POST | `/functions/v1/audit-acceptance/decision/decide` | Supabase JWT | Partner approval or rejection of acceptance | `{ orgSlug, engagementId, approvalId, decision, note? }` | `{ decision }` | 10/min per user | n/a |
| GET | `/functions/v1/audit-acceptance/status` | Supabase JWT | Returns acceptance snapshot (decision, background, independence, approvals) | Query: `orgSlug`, `engagementId` | `{ status, background, independence, approvals[] }` | 60/min per user | auto |
| GET | `/functions/v1/audit-pbc/list` | Supabase JWT | List PBC requests with deliveries for an engagement | Query: `orgSlug`, `engagementId` | `{ requests[] }` | 60/min per user | auto |
| POST | `/functions/v1/audit-pbc/template/instantiate` | Supabase JWT | Create PBC requests for a cycle from template items | `{ orgSlug, engagementId, cycle, items[] }` | `{ requests[] }` | 20/min per user | n/a |
| POST | `/functions/v1/audit-pbc/request/update-status` | Supabase JWT | Update request status, attach delivery, auto-ingest to evidence | `{ orgSlug, requestId, status, documentId?, note?, procedureId? }` | `{ requests[] }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-pbc/request/remind` | Supabase JWT | Queue reminder notification for client PBC item | `{ orgSlug, requestId, message? }` | `{ success }` | 20/min per user | n/a |
| GET | `/functions/v1/audit-controls/list` | Supabase JWT | Fetch controls, walkthroughs, tests, deficiencies, ITGC groups | Query: `orgSlug`, `engagementId` | `{ controls[], itgcGroups[], deficiencies[] }` | 60/min per user | auto |
| POST | `/functions/v1/audit-controls/control/upsert` | Supabase JWT | Create or update a control matrix entry | `{ orgSlug, engagementId, cycle, objective, ... }` | `{ id }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-controls/control/walkthrough/log` | Supabase JWT | Record design/implementation walkthrough outcome | `{ orgSlug, controlId, date, result, notes? }` | `{ success }` | 40/min per user | n/a |
| POST | `/functions/v1/audit-controls/control/test/run` | Supabase JWT | Log attributes testing, auto-raise deficiency on exceptions | `{ orgSlug, controlId, attributes?, samplePlanRef?, result, severity?, recommendation? }` | `{ success }` | 40/min per user | n/a |
| POST | `/functions/v1/audit-controls/deficiency/create` | Supabase JWT | Manually create deficiency linked to controls | `{ orgSlug, engagementId, controlId?, severity, recommendation, status? }` | `{ success }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-controls/itgc/upsert` | Supabase JWT | Register ITGC grouping (access/change/operations) | `{ orgSlug, engagementId?, type, scope?, notes? }` | `{ success }` | 20/min per user | n/a |
| POST | `/functions/v1/audit-tcwg/create` | Supabase JWT | Initialise TCWG pack with data from report, misstatements, GC | `{ orgSlug, engagementId }` | `{ pack }` | 20/min per user | n/a |
| POST | `/functions/v1/audit-tcwg/update` | Supabase JWT | Update TCWG narrative fields and deficiencies | `{ orgSlug, engagementId, packId, ... }` | `{ pack }` | 60/min per user | n/a |
| POST | `/functions/v1/audit-tcwg/render` | Supabase JWT | Render TCWG pack PDF to storage | `{ orgSlug, engagementId, packId }` | `{ pack, documentId }` | 20/min per user | n/a |
| POST | `/functions/v1/audit-tcwg/build-zip` | Supabase JWT | Build ZIP containing PDF and annex JSON schedules | `{ orgSlug, engagementId, packId }` | `{ pack, documentId, sha256 }` | 20/min per user | n/a |
| POST | `/functions/v1/audit-tcwg/submit` | Supabase JWT | Submit pack for approval (Manager/Partner/EQR) | `{ orgSlug, engagementId, packId }` | `{ pack }` | 10/min per user | n/a |
| POST | `/functions/v1/audit-tcwg/approval/decide` | Supabase JWT | Record TCWG approval decision | `{ orgSlug, engagementId, approvalId, decision, note? }` | `{ approvals[] }` | 30/min per user | n/a |
| POST | `/functions/v1/audit-tcwg/send` | Supabase JWT | Share pack with client portal, update archive manifest | `{ orgSlug, engagementId, packId }` | `{ pack, shareUrl, sha256 }` | 10/min per user | n/a |
| GET | `/functions/v1/audit-tcwg/get` | Supabase JWT | Fetch TCWG pack, approvals, report release status | Query: `orgSlug`, `engagementId` | `{ pack, approvals[], reportReleased }` | 60/min per user | auto |

## n8n Workflows
_No n8n workflow exports were found in the repository. All workflows should be exported to version control with IDs, triggers, external calls, error handling, retry, and rate limit metadata._

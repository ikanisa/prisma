-- Audit E1 schema additions for Key Audit Matters (ISA 701)
-- Introduces candidate vetting and drafting workflow tables together with
-- supporting registers for estimates, going concern assessments, and planned procedures.

-- Enumerations ------------------------------------------------------------
create type if not exists public.estimate_uncertainty_level as enum (
  'LOW',
  'MODERATE',
  'HIGH',
  'SIGNIFICANT'
);

create type if not exists public.going_concern_assessment as enum (
  'STABLE',
  'SIGNIFICANT_DOUBT',
  'MATERIAL_UNCERTAINTY'
);

create type if not exists public.kam_candidate_source as enum (
  'RISK',
  'ESTIMATE',
  'GOING_CONCERN',
  'OTHER'
);

create type if not exists public.kam_candidate_status as enum (
  'CANDIDATE',
  'SELECTED',
  'EXCLUDED'
);

create type if not exists public.kam_draft_status as enum (
  'DRAFT',
  'READY_FOR_REVIEW',
  'APPROVED',
  'REJECTED'
);

-- Estimate register ------------------------------------------------------
create table if not exists public.estimate_register (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  caption text not null,
  description text,
  basis text,
  uncertainty_level public.estimate_uncertainty_level not null default 'LOW',
  management_assessment text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_estimate_register_org_eng on public.estimate_register(org_id, engagement_id);
create index if not exists idx_estimate_register_uncertainty on public.estimate_register(uncertainty_level);

create trigger trg_estimate_register_touch
  before update on public.estimate_register
  for each row execute function app.touch_updated_at();

-- Going concern worksheet -------------------------------------------------
create table if not exists public.going_concern_worksheets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  assessment public.going_concern_assessment not null default 'STABLE',
  indicators jsonb not null default '[]'::jsonb,
  conclusion text,
  mitigation_actions text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gc_worksheets_org_eng on public.going_concern_worksheets(org_id, engagement_id);
create index if not exists idx_gc_worksheets_assessment on public.going_concern_worksheets(assessment);

create trigger trg_gc_worksheets_touch
  before update on public.going_concern_worksheets
  for each row execute function app.touch_updated_at();

-- Planned procedures ------------------------------------------------------
create table if not exists public.audit_planned_procedures (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  risk_id uuid references public.risks(id) on delete set null,
  title text not null,
  objective text,
  isa_references text[] not null default '{}',
  notes text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_planned_procedures_org_eng on public.audit_planned_procedures(org_id, engagement_id);
create index if not exists idx_planned_procedures_risk on public.audit_planned_procedures(risk_id) where risk_id is not null;

create trigger trg_planned_procedures_touch
  before update on public.audit_planned_procedures
  for each row execute function app.touch_updated_at();

-- Audit evidence ---------------------------------------------------------
create table if not exists public.audit_evidence (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  procedure_id uuid references public.audit_planned_procedures(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  workpaper_id uuid references public.workpapers(id) on delete set null,
  description text,
  obtained_at timestamptz,
  prepared_by_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_evidence_org_eng on public.audit_evidence(org_id, engagement_id);
create index if not exists idx_audit_evidence_procedure on public.audit_evidence(procedure_id);

create trigger trg_audit_evidence_touch
  before update on public.audit_evidence
  for each row execute function app.touch_updated_at();

-- kam_candidates ---------------------------------------------------------
create table if not exists public.kam_candidates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  source public.kam_candidate_source not null default 'OTHER',
  risk_id uuid references public.risks(id) on delete set null,
  estimate_id uuid references public.estimate_register(id) on delete set null,
  going_concern_id uuid references public.going_concern_worksheets(id) on delete set null,
  title text not null,
  rationale text,
  status public.kam_candidate_status not null default 'CANDIDATE',
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kam_candidates_source_fk check (
    (source = 'RISK' and risk_id is not null and estimate_id is null and going_concern_id is null) or
    (source = 'ESTIMATE' and estimate_id is not null and risk_id is null and going_concern_id is null) or
    (source = 'GOING_CONCERN' and going_concern_id is not null and risk_id is null and estimate_id is null) or
    (source = 'OTHER' and risk_id is null and estimate_id is null and going_concern_id is null)
  )
);

create index if not exists idx_kam_candidates_org_eng on public.kam_candidates(org_id, engagement_id);
create index if not exists idx_kam_candidates_status on public.kam_candidates(status);
create index if not exists idx_kam_candidates_risk on public.kam_candidates(risk_id) where risk_id is not null;
create index if not exists idx_kam_candidates_estimate on public.kam_candidates(estimate_id) where estimate_id is not null;
create index if not exists idx_kam_candidates_gc on public.kam_candidates(going_concern_id) where going_concern_id is not null;

create trigger trg_kam_candidates_touch
  before update on public.kam_candidates
  for each row execute function app.touch_updated_at();

create unique index if not exists uq_kam_candidate_risk
  on public.kam_candidates(engagement_id, risk_id)
  where risk_id is not null;

create unique index if not exists uq_kam_candidate_estimate
  on public.kam_candidates(engagement_id, estimate_id)
  where estimate_id is not null;

create unique index if not exists uq_kam_candidate_gc
  on public.kam_candidates(engagement_id, going_concern_id)
  where going_concern_id is not null;

-- kam_drafts -------------------------------------------------------------
create table if not exists public.kam_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  candidate_id uuid not null references public.kam_candidates(id) on delete cascade,
  heading text not null,
  why_kam text,
  how_addressed text,
  procedures_refs jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  results_summary text,
  status public.kam_draft_status not null default 'DRAFT',
  submitted_at timestamptz,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  eqr_approved_by_user_id uuid references auth.users(id) on delete set null,
  eqr_approved_at timestamptz,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kam_drafts_same_org check (
    org_id = (select org_id from public.kam_candidates where id = candidate_id)
  ),
  constraint kam_drafts_same_engagement check (
    engagement_id = (select engagement_id from public.kam_candidates where id = candidate_id)
  ),
  constraint kam_drafts_refs_are_arrays check (
    jsonb_typeof(procedures_refs) = 'array' and jsonb_typeof(evidence_refs) = 'array'
  )
);

create unique index if not exists uq_kam_draft_candidate on public.kam_drafts(candidate_id);
create index if not exists idx_kam_drafts_org_eng on public.kam_drafts(org_id, engagement_id);
create index if not exists idx_kam_drafts_status on public.kam_drafts(status);

create trigger trg_kam_drafts_touch
  before update on public.kam_drafts
  for each row execute function app.touch_updated_at();

-- Approval queue ----------------------------------------------------------
create type if not exists public.approval_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

create type if not exists public.approval_stage as enum (
  'MANAGER',
  'PARTNER',
  'EQR'
);

create table if not exists public.approval_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  kind text not null,
  stage public.approval_stage not null,
  status public.approval_status not null default 'PENDING',
  candidate_id uuid references public.kam_candidates(id) on delete cascade,
  draft_id uuid references public.kam_drafts(id) on delete cascade,
  assignee_user_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid references auth.users(id) on delete set null,
  resolution_note text,
  constraint approval_queue_target check (
    (kind = 'KAM_DRAFT' and draft_id is not null) or
    (kind <> 'KAM_DRAFT')
  )
);

create index if not exists idx_approval_queue_org_status on public.approval_queue(org_id, status);
create index if not exists idx_approval_queue_engagement on public.approval_queue(engagement_id);
create index if not exists idx_approval_queue_stage on public.approval_queue(stage);

create trigger trg_approval_queue_touch
  before update on public.approval_queue
  for each row execute function app.touch_updated_at();

-- Risk metadata extensions -----------------------------------------------
alter table public.risks
  add column if not exists is_significant boolean not null default false,
  add column if not exists is_fraud_risk boolean not null default false,
  add column if not exists area text;

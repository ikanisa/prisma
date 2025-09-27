-- Audit E2 schema additions for report assembly (ISA 700/701/705/706)

-- Opinion enums -----------------------------------------------------------
create type if not exists public.audit_opinion as enum (
  'UNMODIFIED',
  'QUALIFIED',
  'ADVERSE',
  'DISCLAIMER'
);

-- Report draft table ------------------------------------------------------
create table if not exists public.audit_report_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  opinion public.audit_opinion not null default 'UNMODIFIED',
  basis_for_opinion text,
  include_eom boolean not null default false,
  eom_text text,
  include_om boolean not null default false,
  om_text text,
  incorporate_kams boolean not null default true,
  kam_ids uuid[] not null default '{}',
  gc_disclosure_required boolean not null default false,
  draft_html text,
  status text not null default 'DRAFT',
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  eqr_approved_by_user_id uuid references auth.users(id) on delete set null,
  eqr_approved_at timestamptz,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_report_drafts_org_eng on public.audit_report_drafts(org_id, engagement_id);
create index if not exists idx_audit_report_drafts_status on public.audit_report_drafts(status);

create trigger trg_audit_report_drafts_touch
  before update on public.audit_report_drafts
  for each row execute function app.touch_updated_at();

-- Helper view materialised via HTML builder would live app-side

-- Activity log indexes ----------------------------------------------------
create index if not exists idx_activity_log_action on public.activity_log(action);


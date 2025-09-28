-- Audit E3 schema additions for TCWG communication pack and archive linkage

-- Enumerations ------------------------------------------------------------
create type if not exists public.tcwg_pack_status as enum (
  'DRAFT',
  'READY_FOR_REVIEW',
  'APPROVED',
  'SENT'
);

-- Engagement archive manifest --------------------------------------------
create table if not exists public.engagement_archives (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  manifest jsonb not null default '{}'::jsonb,
  sha256 text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (engagement_id)
);

create trigger trg_engagement_archives_touch
  before update on public.engagement_archives
  for each row execute function app.touch_updated_at();

-- TCWG packs --------------------------------------------------------------
create table if not exists public.tcwg_packs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  report_draft_id uuid references public.audit_report_drafts(id) on delete set null,
  independence_statement text,
  scope_summary text,
  significant_findings text,
  significant_difficulties text,
  uncorrected_misstatements jsonb not null default '[]'::jsonb,
  corrected_misstatements jsonb not null default '[]'::jsonb,
  deficiencies jsonb not null default '[]'::jsonb,
  kam_summary jsonb not null default '[]'::jsonb,
  going_concern_summary jsonb not null default '{}'::jsonb,
  subsequent_events_summary jsonb not null default '{}'::jsonb,
  other_matters text,
  status public.tcwg_pack_status not null default 'DRAFT',
  pdf_document_id uuid references public.documents(id) on delete set null,
  zip_document_id uuid references public.documents(id) on delete set null,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  eqr_approved_by_user_id uuid references auth.users(id) on delete set null,
  eqr_approved_at timestamptz,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tcwg_packs_org_eng on public.tcwg_packs(org_id, engagement_id);
create index if not exists idx_tcwg_packs_status on public.tcwg_packs(status);

create trigger trg_tcwg_packs_touch
  before update on public.tcwg_packs
  for each row execute function app.touch_updated_at();


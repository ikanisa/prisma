-- Audit AC1 schema: Client acceptance and independence (ISQM 1 / ISA 220 / IESBA)

-- Enumerations ------------------------------------------------------------
create type if not exists public.background_risk_rating as enum ('LOW','MEDIUM','HIGH','UNKNOWN');
create type if not exists public.independence_conclusion as enum ('OK','SAFEGUARDS_REQUIRED','PROHIBITED');
create type if not exists public.acceptance_decision as enum ('ACCEPT','DECLINE');
create type if not exists public.acceptance_status as enum ('DRAFT','APPROVED','REJECTED');

-- Client background checks ------------------------------------------------
create table if not exists public.client_background_checks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  screenings jsonb not null default '{}'::jsonb,
  risk_rating public.background_risk_rating not null default 'UNKNOWN',
  notes text,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_background_check_client
  on public.client_background_checks(org_id, client_id);

-- Independence assessments ------------------------------------------------
create table if not exists public.independence_assessments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  threats jsonb not null default '[]'::jsonb,
  safeguards jsonb not null default '[]'::jsonb,
  conclusion public.independence_conclusion not null default 'OK',
  prepared_by_user_id uuid not null references auth.users(id) on delete restrict,
  prepared_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_independence_assessment_client
  on public.independence_assessments(org_id, client_id);

create trigger trg_independence_assessments_touch
  before update on public.independence_assessments
  for each row execute function app.touch_updated_at();

-- Acceptance decisions ----------------------------------------------------
create table if not exists public.acceptance_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  decision public.acceptance_decision not null default 'ACCEPT',
  eqr_required boolean not null default false,
  rationale text,
  status public.acceptance_status not null default 'DRAFT',
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  updated_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint acceptance_unique_engagement unique (engagement_id)
);

create index if not exists idx_acceptance_decisions_org_eng
  on public.acceptance_decisions(org_id, engagement_id);

create trigger trg_acceptance_decisions_touch
  before update on public.acceptance_decisions
  for each row execute function app.touch_updated_at();

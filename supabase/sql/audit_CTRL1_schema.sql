-- Audit Controls Matrix & ITGC schema (CTRL-1)
-- Defines control register, walkthroughs, testing, ITGC groupings, and deficiencies.

CREATE TYPE IF NOT EXISTS public.control_frequency AS ENUM (
  'DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL','EVENT_DRIVEN'
);

CREATE TYPE IF NOT EXISTS public.control_walkthrough_result AS ENUM (
  'DESIGNED','NOT_DESIGNED','IMPLEMENTED','NOT_IMPLEMENTED'
);

CREATE TYPE IF NOT EXISTS public.control_test_result AS ENUM ('PASS','EXCEPTIONS');

CREATE TYPE IF NOT EXISTS public.itgc_group_type AS ENUM ('ACCESS','CHANGE','OPERATIONS');

CREATE TYPE IF NOT EXISTS public.deficiency_severity AS ENUM ('LOW','MEDIUM','HIGH');

CREATE TYPE IF NOT EXISTS public.deficiency_status AS ENUM ('OPEN','MONITORING','CLOSED');

CREATE TABLE IF NOT EXISTS public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  cycle TEXT NOT NULL,
  objective TEXT NOT NULL,
  description TEXT NOT NULL,
  frequency public.control_frequency NOT NULL DEFAULT 'MONTHLY',
  owner TEXT,
  key BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, engagement_id, cycle, objective, description)
);

CREATE INDEX IF NOT EXISTS controls_org_eng_idx ON public.controls (org_id, engagement_id, cycle);

CREATE TABLE IF NOT EXISTS public.control_walkthroughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  walkthrough_date DATE NOT NULL,
  notes TEXT,
  result public.control_walkthrough_result NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS control_walkthroughs_control_idx ON public.control_walkthroughs (control_id);

CREATE TABLE IF NOT EXISTS public.control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  sample_plan_ref TEXT,
  attributes JSONB NOT NULL,
  result public.control_test_result NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS control_tests_control_idx ON public.control_tests (control_id);

CREATE TABLE IF NOT EXISTS public.itgc_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  type public.itgc_group_type NOT NULL,
  scope TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS itgc_groups_org_idx ON public.itgc_groups (org_id, engagement_id, type);

CREATE TABLE IF NOT EXISTS public.deficiencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  control_id UUID REFERENCES public.controls(id) ON DELETE SET NULL,
  severity public.deficiency_severity NOT NULL,
  recommendation TEXT NOT NULL,
  status public.deficiency_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deficiencies_org_idx ON public.deficiencies (org_id, engagement_id, severity, status);

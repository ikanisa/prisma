-- DAC6 hallmark & submission schema (T-2B)

BEGIN;

CREATE TYPE IF NOT EXISTS public.dac6_hallmark_category AS ENUM (
  'A', 'B', 'C', 'D', 'E'
);

CREATE TYPE IF NOT EXISTS public.dac6_submission_status AS ENUM (
  'DRAFT', 'READY_FOR_SUBMISSION', 'SUBMITTED', 'REJECTED'
);

CREATE TABLE IF NOT EXISTS public.dac6_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  description TEXT,
  first_step_date DATE,
  disclosure_due_date DATE,
  status public.dac6_submission_status NOT NULL DEFAULT 'DRAFT',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dac6_hallmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES public.dac6_arrangements(id) ON DELETE CASCADE,
  category public.dac6_hallmark_category NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  main_benefit_test BOOLEAN DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dac6_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES public.dac6_arrangements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  jurisdiction TEXT,
  tin TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dac6_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES public.dac6_arrangements(id) ON DELETE CASCADE,
  submission_reference TEXT,
  submitted_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dac6_arrangements_org_status
  ON public.dac6_arrangements(org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dac6_hallmarks_arrangement ON public.dac6_hallmarks(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_dac6_participants_arrangement ON public.dac6_participants(arrangement_id);
CREATE INDEX IF NOT EXISTS idx_dac6_filings_arrangement ON public.dac6_filings(arrangement_id);

CREATE TRIGGER trg_dac6_arrangements_touch
  BEFORE UPDATE ON public.dac6_arrangements
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;

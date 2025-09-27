-- Deterministic Analytics Kernel schema (ADA-1)
-- Defines ADA run metadata and exception tracking with ATT lineage fields.

CREATE TYPE IF NOT EXISTS public.ada_run_kind AS ENUM (
  'JE',
  'RATIO',
  'VARIANCE',
  'DUPLICATE',
  'BENFORD'
);

CREATE TYPE IF NOT EXISTS public.ada_exception_disposition AS ENUM (
  'OPEN',
  'INVESTIGATING',
  'RESOLVED'
);

CREATE TABLE IF NOT EXISTS public.ada_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  kind public.ada_run_kind NOT NULL,
  dataset_ref TEXT NOT NULL,
  dataset_hash TEXT NOT NULL,
  params JSONB NOT NULL,
  summary JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ada_runs_org_idx ON public.ada_runs (org_id, engagement_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ada_runs_kind_idx ON public.ada_runs (kind);

CREATE TABLE IF NOT EXISTS public.ada_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.ada_runs(id) ON DELETE CASCADE,
  record_ref TEXT NOT NULL,
  score NUMERIC(12,4),
  reason TEXT NOT NULL,
  note TEXT,
  disposition public.ada_exception_disposition NOT NULL DEFAULT 'OPEN',
  misstatement_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ada_exceptions_run_idx ON public.ada_exceptions (run_id);
CREATE INDEX IF NOT EXISTS ada_exceptions_disposition_idx ON public.ada_exceptions (disposition);

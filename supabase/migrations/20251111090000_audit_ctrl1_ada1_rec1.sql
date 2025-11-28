-- Autonomous Finance Suite outstanding modules (CTRL-1 / ADA-1 / REC-1)
-- Applies schema and RLS for controls, deterministic analytics, and reconciliation workbench.

BEGIN;

-- CTRL-1: Controls, walkthroughs, testing, ITGC groupings, deficiencies
DO $$
BEGIN
  CREATE TYPE public.control_frequency AS ENUM (

  'DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL','EVENT_DRIVEN'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


DO $$
BEGIN
  CREATE TYPE public.control_walkthrough_result AS ENUM (

  'DESIGNED','NOT_DESIGNED','IMPLEMENTED','NOT_IMPLEMENTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


DO $$
BEGIN
  CREATE TYPE public.control_test_result AS ENUM (
'PASS','EXCEPTIONS'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


DO $$
BEGIN
  CREATE TYPE public.itgc_group_type AS ENUM (
'ACCESS','CHANGE','OPERATIONS'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


DO $$
BEGIN
  CREATE TYPE public.deficiency_severity AS ENUM (
'LOW','MEDIUM','HIGH'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


DO $$
BEGIN
  CREATE TYPE public.deficiency_status AS ENUM (
'OPEN','MONITORING','CLOSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DROP TABLE IF EXISTS public.samples CASCADE;
DROP TABLE IF EXISTS public.tests CASCADE;
DROP TABLE IF EXISTS public.control_walkthroughs CASCADE;
DROP TABLE IF EXISTS public.control_tests CASCADE;
DROP TABLE IF EXISTS public.itgc_groups CASCADE;
DROP TABLE IF EXISTS public.deficiencies CASCADE;
DROP TABLE IF EXISTS public.controls CASCADE;


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

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_walkthroughs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.control_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itgc_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deficiencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "controls_select" ON public.controls;
CREATE POLICY "controls_select" ON public.controls
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "controls_insert" ON public.controls;
CREATE POLICY "controls_insert" ON public.controls
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "controls_update" ON public.controls;
CREATE POLICY "controls_update" ON public.controls
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "controls_delete" ON public.controls;
CREATE POLICY "controls_delete" ON public.controls
  FOR DELETE USING (public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

DROP POLICY IF EXISTS "control_walkthroughs_select" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_select" ON public.control_walkthroughs
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "control_walkthroughs_insert" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_insert" ON public.control_walkthroughs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS "control_walkthroughs_update" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_update" ON public.control_walkthroughs
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "control_walkthroughs_delete" ON public.control_walkthroughs;
CREATE POLICY "control_walkthroughs_delete" ON public.control_walkthroughs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

DROP POLICY IF EXISTS "control_tests_select" ON public.control_tests;
CREATE POLICY "control_tests_select" ON public.control_tests
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "control_tests_insert" ON public.control_tests;
CREATE POLICY "control_tests_insert" ON public.control_tests
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS "control_tests_update" ON public.control_tests;
CREATE POLICY "control_tests_update" ON public.control_tests
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "control_tests_delete" ON public.control_tests;
CREATE POLICY "control_tests_delete" ON public.control_tests
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

DROP POLICY IF EXISTS "itgc_groups_select" ON public.itgc_groups;
CREATE POLICY "itgc_groups_select" ON public.itgc_groups
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "itgc_groups_insert" ON public.itgc_groups;
CREATE POLICY "itgc_groups_insert" ON public.itgc_groups
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "itgc_groups_update" ON public.itgc_groups;
CREATE POLICY "itgc_groups_update" ON public.itgc_groups
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "itgc_groups_delete" ON public.itgc_groups;
CREATE POLICY "itgc_groups_delete" ON public.itgc_groups
  FOR DELETE USING (public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

DROP POLICY IF EXISTS "deficiencies_select" ON public.deficiencies;
CREATE POLICY "deficiencies_select" ON public.deficiencies
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "deficiencies_insert" ON public.deficiencies;
CREATE POLICY "deficiencies_insert" ON public.deficiencies
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "deficiencies_update" ON public.deficiencies;
CREATE POLICY "deficiencies_update" ON public.deficiencies
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "deficiencies_delete" ON public.deficiencies;
CREATE POLICY "deficiencies_delete" ON public.deficiencies
  FOR DELETE USING (public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));

-- ADA-1: Deterministic analytics kernel
DO $$
BEGIN
  CREATE TYPE public.ada_run_kind AS ENUM (

  'JE','RATIO','VARIANCE','DUPLICATE','BENFORD'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


DO $$
BEGIN
  CREATE TYPE public.ada_exception_disposition AS ENUM (

  'OPEN','INVESTIGATING','RESOLVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


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

ALTER TABLE public.ada_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ada_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ada_runs_select" ON public.ada_runs;
CREATE POLICY "ada_runs_select" ON public.ada_runs
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "ada_runs_insert" ON public.ada_runs;
CREATE POLICY "ada_runs_insert" ON public.ada_runs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS "ada_runs_update" ON public.ada_runs;
CREATE POLICY "ada_runs_update" ON public.ada_runs
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "ada_runs_delete" ON public.ada_runs;
CREATE POLICY "ada_runs_delete" ON public.ada_runs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

DROP POLICY IF EXISTS "ada_exceptions_select" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_select" ON public.ada_exceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.is_member_of(r.org_id)
    )
  );
DROP POLICY IF EXISTS "ada_exceptions_insert" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_insert" ON public.ada_exceptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.has_min_role(r.org_id, 'EMPLOYEE'::public.role_level)
    )
  );
DROP POLICY IF EXISTS "ada_exceptions_update" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_update" ON public.ada_exceptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.has_min_role(r.org_id, 'EMPLOYEE'::public.role_level)
    )
  );
DROP POLICY IF EXISTS "ada_exceptions_delete" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_delete" ON public.ada_exceptions
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.has_min_role(r.org_id, 'MANAGER'::public.role_level)
    )
  );

-- REC-1: Reconciliation workbench
DO $$
BEGIN
  CREATE TYPE public.reconciliation_type AS ENUM (
'BANK','AR','AP','GRNI','PAYROLL','OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_status AS ENUM (
'DRAFT','IN_PROGRESS','READY_FOR_REVIEW','CLOSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_item_category AS ENUM (

  'OUTSTANDING_CHECKS',
  'DEPOSITS_IN_TRANSIT',
  'UNIDENTIFIED',
  'UNAPPLIED_RECEIPT',
  'UNAPPLIED_PAYMENT',
  'TIMING',
  'ERROR',
  'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;


CREATE TABLE IF NOT EXISTS public.reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  type public.reconciliation_type NOT NULL,
  control_account_id UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  gl_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  external_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference NUMERIC(18,2) NOT NULL DEFAULT 0,
  status public.reconciliation_status NOT NULL DEFAULT 'DRAFT',
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  schedule_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reconciliations_org_idx ON public.reconciliations (org_id, entity_id, period_id, type);

CREATE TABLE IF NOT EXISTS public.reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL REFERENCES public.reconciliations(id) ON DELETE CASCADE,
  category public.reconciliation_item_category NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  reference TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reconciliation_items_rec_idx ON public.reconciliation_items (reconciliation_id, category);

CREATE TRIGGER reconciliations_updated_at
  BEFORE UPDATE ON public.reconciliations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER reconciliation_items_updated_at
  BEFORE UPDATE ON public.reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reconciliations_select" ON public.reconciliations;
CREATE POLICY "reconciliations_select" ON public.reconciliations
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "reconciliations_insert" ON public.reconciliations;
CREATE POLICY "reconciliations_insert" ON public.reconciliations
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS "reconciliations_update" ON public.reconciliations;
CREATE POLICY "reconciliations_update" ON public.reconciliations
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));
DROP POLICY IF EXISTS "reconciliations_delete" ON public.reconciliations;
CREATE POLICY "reconciliations_delete" ON public.reconciliations
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

DROP POLICY IF EXISTS "reconciliation_items_select" ON public.reconciliation_items;
CREATE POLICY "reconciliation_items_select" ON public.reconciliation_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = reconciliation_items.reconciliation_id
        AND public.is_member_of(r.org_id)
    )
  );
DROP POLICY IF EXISTS "reconciliation_items_insert" ON public.reconciliation_items;
CREATE POLICY "reconciliation_items_insert" ON public.reconciliation_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = reconciliation_items.reconciliation_id
        AND public.has_min_role(r.org_id, 'EMPLOYEE'::public.role_level)
    )
  );
DROP POLICY IF EXISTS "reconciliation_items_update" ON public.reconciliation_items;
CREATE POLICY "reconciliation_items_update" ON public.reconciliation_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = reconciliation_items.reconciliation_id
        AND public.has_min_role(r.org_id, 'MANAGER'::public.role_level)
    )
  );
DROP POLICY IF EXISTS "reconciliation_items_delete" ON public.reconciliation_items;
CREATE POLICY "reconciliation_items_delete" ON public.reconciliation_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.reconciliations r
      WHERE r.id = reconciliation_items.reconciliation_id
        AND public.has_min_role(r.org_id, 'MANAGER'::public.role_level)
    )
  );

COMMIT;

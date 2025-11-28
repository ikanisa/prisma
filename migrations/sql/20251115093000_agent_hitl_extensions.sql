set check_function_bodies = off;

-- Enumerations ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'agent_run_state'
  ) THEN
    CREATE TYPE public.agent_run_state AS ENUM ('PLANNING', 'EXECUTING', 'DONE', 'ERROR');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'agent_action_status'
  ) THEN
    CREATE TYPE public.agent_action_status AS ENUM ('PENDING', 'SUCCESS', 'ERROR', 'BLOCKED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'agent_trace_type'
  ) THEN
    CREATE TYPE public.agent_trace_type AS ENUM ('INFO', 'TOOL', 'ERROR');
  END IF;
END $$;

ALTER TYPE public.approval_status ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';

GRANT USAGE ON TYPE public.agent_run_state TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.agent_action_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.agent_trace_type TO anon, authenticated, service_role;

-- Agent run + action tables ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  state public.agent_run_state NOT NULL DEFAULT 'PLANNING',
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_runs_session_step
  ON public.agent_runs(session_id, step_index);
CREATE INDEX IF NOT EXISTS idx_agent_runs_org_created
  ON public.agent_runs(org_id, created_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_runs_select ON public.agent_runs;
CREATE POLICY agent_runs_select ON public.agent_runs
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS agent_runs_insert ON public.agent_runs;
CREATE POLICY agent_runs_insert ON public.agent_runs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS agent_runs_update ON public.agent_runs;
CREATE POLICY agent_runs_update ON public.agent_runs
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS agent_runs_delete ON public.agent_runs;
CREATE POLICY agent_runs_delete ON public.agent_runs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

DROP TRIGGER IF EXISTS trg_agent_runs_touch ON public.agent_runs;
CREATE TRIGGER trg_agent_runs_touch
  BEFORE UPDATE ON public.agent_runs
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL DEFAULT 'TOOL',
  tool_key TEXT NOT NULL,
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_json JSONB,
  status public.agent_action_status NOT NULL DEFAULT 'PENDING',
  requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sensitive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_org_status
  ON public.agent_actions(org_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_actions_session
  ON public.agent_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_run
  ON public.agent_actions(run_id);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_actions_select ON public.agent_actions;
CREATE POLICY agent_actions_select ON public.agent_actions
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS agent_actions_insert ON public.agent_actions;
CREATE POLICY agent_actions_insert ON public.agent_actions
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS agent_actions_update ON public.agent_actions;
CREATE POLICY agent_actions_update ON public.agent_actions
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS agent_actions_delete ON public.agent_actions;
CREATE POLICY agent_actions_delete ON public.agent_actions
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

DROP TRIGGER IF EXISTS trg_agent_actions_touch ON public.agent_actions;
CREATE TRIGGER trg_agent_actions_touch
  BEFORE UPDATE ON public.agent_actions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.agent_sessions(id) ON DELETE SET NULL,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  trace_type public.agent_trace_type NOT NULL DEFAULT 'INFO',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_org_created
  ON public.agent_traces(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_traces_session
  ON public.agent_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_traces_run
  ON public.agent_traces(run_id);

ALTER TABLE public.agent_traces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_traces_select ON public.agent_traces;
CREATE POLICY agent_traces_select ON public.agent_traces
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS agent_traces_insert ON public.agent_traces;
CREATE POLICY agent_traces_insert ON public.agent_traces
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS agent_traces_delete ON public.agent_traces;
CREATE POLICY agent_traces_delete ON public.agent_traces
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

-- Tool registry -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tool_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  label TEXT,
  description TEXT,
  min_role TEXT NOT NULL DEFAULT 'EMPLOYEE',
  sensitive BOOLEAN NOT NULL DEFAULT false,
  standards_refs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enabled BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tool_registry_min_role_check CHECK (min_role IN ('EMPLOYEE', 'MANAGER', 'SYSTEM_ADMIN'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tool_registry_key_org
  ON public.tool_registry(key, org_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tool_registry_key_global
  ON public.tool_registry(key)
  WHERE org_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tool_registry_enabled
  ON public.tool_registry(enabled) WHERE enabled = true;

ALTER TABLE public.tool_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tool_registry_select ON public.tool_registry;
CREATE POLICY tool_registry_select ON public.tool_registry
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));
DROP POLICY IF EXISTS tool_registry_write ON public.tool_registry;
CREATE POLICY tool_registry_write ON public.tool_registry
  FOR ALL USING (org_id IS NULL OR public.has_min_role(org_id, 'MANAGER'::public.role_level))
  WITH CHECK (org_id IS NULL OR public.has_min_role(org_id, 'MANAGER'::public.role_level));

DROP TRIGGER IF EXISTS trg_tool_registry_touch ON public.tool_registry;
CREATE TRIGGER trg_tool_registry_touch
  BEFORE UPDATE ON public.tool_registry
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Approval queue extensions ----------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'approval_queue'
      AND column_name = 'payload'
  ) THEN
    EXECUTE 'ALTER TABLE public.approval_queue RENAME COLUMN payload TO context_json';
  END IF;
END $$;

ALTER TABLE IF EXISTS public.approval_queue
  ALTER COLUMN engagement_id DROP NOT NULL,
  ALTER COLUMN stage SET DEFAULT 'MANAGER';

UPDATE public.approval_queue
SET stage = 'MANAGER'
WHERE stage IS NULL;

ALTER TABLE IF EXISTS public.approval_queue
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decision_comment TEXT,
  ADD COLUMN IF NOT EXISTS context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.agent_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_id UUID REFERENCES public.agent_actions(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.approval_queue
  ALTER COLUMN context_json SET DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_approval_queue_requested_at
  ON public.approval_queue(org_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_queue_kind_status
  ON public.approval_queue(org_id, kind, status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_session
  ON public.approval_queue(session_id);

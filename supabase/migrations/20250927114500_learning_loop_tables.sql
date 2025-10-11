-- Learning loop foundational tables (signals, metrics, jobs, policies)

CREATE TABLE IF NOT EXISTS public.learning_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id UUID,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_signals_org_created_idx
  ON public.learning_signals (org_id, created_at DESC);

ALTER TABLE public.learning_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_signals_read ON public.learning_signals;
CREATE POLICY learning_signals_read ON public.learning_signals
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS learning_signals_write ON public.learning_signals;
CREATE POLICY learning_signals_write ON public.learning_signals
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE TABLE IF NOT EXISTS public.learning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  window_name TEXT NOT NULL,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  dims JSONB DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_metrics_org_metric_idx
  ON public.learning_metrics (org_id, metric, computed_at DESC);

ALTER TABLE public.learning_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_metrics_read ON public.learning_metrics;
CREATE POLICY learning_metrics_read ON public.learning_metrics
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS learning_metrics_write ON public.learning_metrics;
CREATE POLICY learning_metrics_write ON public.learning_metrics
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE TYPE public.learning_job_status AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'APPLIED', 'FAILED', 'ROLLED_BACK');
CREATE TYPE public.learning_job_kind AS ENUM ('query_hint_add', 'guardrail_tune', 'canonicalizer_update', 'denylist_update', 'rollback_policy');
CREATE TYPE public.denylist_action AS ENUM ('deny', 'deboost');

CREATE TABLE IF NOT EXISTS public.agent_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'pending', 'rolled_back')),
  summary TEXT,
  diff JSONB DEFAULT '{}'::jsonb,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS agent_policy_versions_org_version_idx
  ON public.agent_policy_versions (org_id, version);

ALTER TABLE public.agent_policy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_policy_versions_read ON public.agent_policy_versions;
CREATE POLICY agent_policy_versions_read ON public.agent_policy_versions
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS agent_policy_versions_write ON public.agent_policy_versions;
CREATE POLICY agent_policy_versions_write ON public.agent_policy_versions
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE TABLE IF NOT EXISTS public.agent_learning_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.learning_job_kind NOT NULL,
  status public.learning_job_status NOT NULL DEFAULT 'READY',
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT '{}'::jsonb,
  policy_version_id UUID REFERENCES public.agent_policy_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agent_learning_jobs_org_status_idx
  ON public.agent_learning_jobs (org_id, status, created_at DESC);

ALTER TABLE public.agent_learning_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_learning_jobs_read ON public.agent_learning_jobs;
CREATE POLICY agent_learning_jobs_read ON public.agent_learning_jobs
  FOR SELECT USING (public.is_member_of(org_id));

DROP POLICY IF EXISTS agent_learning_jobs_write ON public.agent_learning_jobs;
CREATE POLICY agent_learning_jobs_write ON public.agent_learning_jobs
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE TABLE IF NOT EXISTS public.query_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  juris_code TEXT,
  topic TEXT,
  hint_type TEXT NOT NULL,
  phrase TEXT NOT NULL,
  weight DOUBLE PRECISION DEFAULT 1.0,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  policy_version_id UUID REFERENCES public.agent_policy_versions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS query_hints_org_idx
  ON public.query_hints (org_id, hint_type, activated_at DESC);

ALTER TABLE public.query_hints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS query_hints_read ON public.query_hints;
CREATE POLICY query_hints_read ON public.query_hints
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));

DROP POLICY IF EXISTS query_hints_write ON public.query_hints;
CREATE POLICY query_hints_write ON public.query_hints
  FOR ALL USING (org_id IS NULL OR public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE TABLE IF NOT EXISTS public.citation_canonicalizer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL,
  jurisdiction TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  policy_version_id UUID REFERENCES public.agent_policy_versions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS citation_canonicalizer_pattern_idx
  ON public.citation_canonicalizer (pattern);

ALTER TABLE public.citation_canonicalizer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS citation_canonicalizer_read ON public.citation_canonicalizer;
CREATE POLICY citation_canonicalizer_read ON public.citation_canonicalizer
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));

DROP POLICY IF EXISTS citation_canonicalizer_write ON public.citation_canonicalizer;
CREATE POLICY citation_canonicalizer_write ON public.citation_canonicalizer
  FOR ALL USING (org_id IS NULL OR public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE TABLE IF NOT EXISTS public.denylist_deboost (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  juris_code TEXT,
  reason TEXT,
  pattern TEXT NOT NULL,
  action public.denylist_action NOT NULL DEFAULT 'deboost',
  weight DOUBLE PRECISION,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  policy_version_id UUID REFERENCES public.agent_policy_versions(id) ON DELETE SET NULL
);

ALTER TABLE public.denylist_deboost ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS denylist_deboost_read ON public.denylist_deboost;
CREATE POLICY denylist_deboost_read ON public.denylist_deboost
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));

DROP POLICY IF EXISTS denylist_deboost_write ON public.denylist_deboost;
CREATE POLICY denylist_deboost_write ON public.denylist_deboost
  FOR ALL USING (org_id IS NULL OR public.has_min_role(org_id, 'MANAGER'::public.role_level));

GRANT USAGE ON TYPE public.learning_job_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.learning_job_kind TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.denylist_action TO anon, authenticated, service_role;

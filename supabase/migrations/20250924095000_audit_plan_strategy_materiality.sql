-- Audit planning strategy & materiality schema (AP-PLAN-1)
-- Additive migration: introduces audit_plans, materiality_sets, plan_change_log tables with RLS-ready structure

BEGIN;

CREATE TABLE IF NOT EXISTS public.audit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  basis_framework TEXT NOT NULL,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  approvals JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  locked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_plans_unique_version UNIQUE (org_id, engagement_id, version)
);

CREATE INDEX IF NOT EXISTS idx_audit_plans_org_engagement ON public.audit_plans(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_plans_status ON public.audit_plans(status);

CREATE TABLE IF NOT EXISTS public.materiality_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  fs_materiality NUMERIC(18,2) NOT NULL,
  performance_materiality NUMERIC(18,2) NOT NULL,
  clearly_trivial_threshold NUMERIC(18,2) NOT NULL,
  benchmarks JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale TEXT,
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_materiality_sets_engagement ON public.materiality_sets(engagement_id);

CREATE TABLE IF NOT EXISTS public.plan_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.audit_plans(id) ON DELETE CASCADE,
  changed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_change_log_plan ON public.plan_change_log(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_change_log_engagement ON public.plan_change_log(engagement_id);

CREATE TRIGGER trg_audit_plans_touch
  BEFORE UPDATE ON public.audit_plans
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_materiality_sets_touch
  BEFORE UPDATE ON public.materiality_sets
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;

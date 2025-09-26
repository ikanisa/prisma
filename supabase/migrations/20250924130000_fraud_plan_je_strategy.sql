-- Fraud plan & journal entry strategy schema (AP-PLAN-4)
BEGIN;

CREATE TYPE IF NOT EXISTS public.fraud_plan_status AS ENUM ('DRAFT', 'READY_FOR_APPROVAL', 'LOCKED');

CREATE TABLE IF NOT EXISTS public.fraud_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  status public.fraud_plan_status NOT NULL DEFAULT 'DRAFT',
  brainstorming_notes TEXT,
  inherent_fraud_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  fraud_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  analytics_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  override_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fraud_plans_engagement ON public.fraud_plans(engagement_id);

CREATE TABLE IF NOT EXISTS public.fraud_plan_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  fraud_plan_id UUID NOT NULL REFERENCES public.fraud_plans(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_entry_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  analytics_link JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_je_strategy_engagement ON public.journal_entry_strategies(engagement_id);

CREATE TRIGGER trg_fraud_plans_touch
  BEFORE UPDATE ON public.fraud_plans
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_je_strategies_touch
  BEFORE UPDATE ON public.journal_entry_strategies
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;

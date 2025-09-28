-- Audit risk register & analytics harness schema (AP-PLAN-2)
BEGIN;

CREATE TYPE IF NOT EXISTS public.audit_risk_category AS ENUM (
  'FINANCIAL_STATEMENT',
  'FRAUD',
  'CONTROL',
  'IT',
  'GOING_CONCERN',
  'COMPLIANCE',
  'ESTIMATE',
  'OTHER'
);

CREATE TYPE IF NOT EXISTS public.risk_rating AS ENUM ('LOW', 'MODERATE', 'HIGH', 'SIGNIFICANT');
CREATE TYPE IF NOT EXISTS public.risk_status AS ENUM ('OPEN', 'MONITORED', 'CLOSED');

CREATE TABLE IF NOT EXISTS public.audit_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category public.audit_risk_category NOT NULL,
  assertions TEXT[] NOT NULL DEFAULT '{}',
  likelihood public.risk_rating NOT NULL DEFAULT 'MODERATE',
  impact public.risk_rating NOT NULL DEFAULT 'MODERATE',
  inherent_rating public.risk_rating NOT NULL DEFAULT 'MODERATE',
  residual_rating public.risk_rating,
  status public.risk_status NOT NULL DEFAULT 'OPEN',
  source TEXT NOT NULL DEFAULT 'ANALYTICS',
  analytics_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, engagement_id, code)
);

CREATE INDEX IF NOT EXISTS idx_audit_risks_org_engagement ON public.audit_risks(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_risks_status ON public.audit_risks(status);

CREATE TABLE IF NOT EXISTS public.audit_risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES public.audit_risks(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  source TEXT NOT NULL,
  severity public.risk_rating NOT NULL DEFAULT 'MODERATE',
  metric JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_risk_signals_org_engagement ON public.audit_risk_signals(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_risk_signals_risk_id ON public.audit_risk_signals(risk_id);

CREATE TABLE IF NOT EXISTS public.audit_risk_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES public.audit_risks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_risk_activity_risk ON public.audit_risk_activity(risk_id);

CREATE TRIGGER trg_audit_risks_touch
  BEFORE UPDATE ON public.audit_risks
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;

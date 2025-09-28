-- Audit responses matrix schema (AP-PLAN-3)
BEGIN;

CREATE TYPE IF NOT EXISTS public.response_type AS ENUM ('CONTROL', 'SUBSTANTIVE', 'ANALYTICS', 'SAMPLING', 'OTHER');
CREATE TYPE IF NOT EXISTS public.response_status AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS public.audit_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  risk_id UUID NOT NULL REFERENCES public.audit_risks(id) ON DELETE CASCADE,
  response_type public.response_type NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  procedure JSONB NOT NULL DEFAULT '{}'::jsonb,
  linkage JSONB NOT NULL DEFAULT '{}'::jsonb,
  ownership JSONB NOT NULL DEFAULT '{}'::jsonb,
  planned_effectiveness public.risk_rating NOT NULL DEFAULT 'MODERATE',
  status public.response_status NOT NULL DEFAULT 'PLANNED',
  coverage_assertions TEXT[] NOT NULL DEFAULT '{}',
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_responses_org_engagement ON public.audit_responses(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_responses_risk ON public.audit_responses(risk_id);

CREATE TABLE IF NOT EXISTS public.audit_response_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  response_id UUID NOT NULL REFERENCES public.audit_responses(id) ON DELETE CASCADE,
  completeness BOOLEAN NOT NULL DEFAULT false,
  conclusions TEXT,
  reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_response_checks_response ON public.audit_response_checks(response_id);

CREATE TRIGGER trg_audit_responses_touch
  BEFORE UPDATE ON public.audit_responses
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

COMMIT;

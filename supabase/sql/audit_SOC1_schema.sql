-- Service organisation (SOC-1) schema
-- Tracks service org metadata, SOC reports, complementary user entity controls, and testing results.

CREATE TYPE IF NOT EXISTS public.service_org_type AS ENUM ('TYPE_1', 'TYPE_2');
CREATE TYPE IF NOT EXISTS public.soc_report_scope AS ENUM ('SOC1', 'SOC2', 'SOC3');
CREATE TYPE IF NOT EXISTS public.cuec_status AS ENUM ('NOT_ASSESSED', 'ADEQUATE', 'DEFICIENCY');

CREATE TABLE IF NOT EXISTS public.service_organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  reliance_assessed BOOLEAN NOT NULL DEFAULT false,
  residual_risk TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_org_engagement ON public.service_organisations (org_id, engagement_id);

CREATE TABLE IF NOT EXISTS public.soc_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  service_org_id UUID NOT NULL REFERENCES public.service_organisations(id) ON DELETE CASCADE,
  report_type public.service_org_type NOT NULL DEFAULT 'TYPE_2',
  scope public.soc_report_scope NOT NULL DEFAULT 'SOC1',
  period_start DATE,
  period_end DATE,
  issued_at DATE,
  auditor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_soc_reports_service_org ON public.soc_reports (service_org_id);

CREATE TABLE IF NOT EXISTS public.cuec_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  service_org_id UUID NOT NULL REFERENCES public.service_organisations(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status public.cuec_status NOT NULL DEFAULT 'NOT_ASSESSED',
  tested BOOLEAN NOT NULL DEFAULT false,
  exception_note TEXT,
  compensating_control TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuec_service_org ON public.cuec_controls (service_org_id, status);

CREATE TRIGGER trg_service_organisations_touch
  BEFORE UPDATE ON public.service_organisations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_soc_reports_touch
  BEFORE UPDATE ON public.soc_reports
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_cuec_controls_touch
  BEFORE UPDATE ON public.cuec_controls
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

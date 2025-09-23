-- SOC 1 service organization oversight schema
-- Defines service organization metadata, SOC 1 report tracking, CUEC management,
-- and residual risk logging with row-level security aligned to ISA 402 expectations.

-- Service organizations catalogue
CREATE TABLE IF NOT EXISTS public.service_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  control_owner TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  system_scope TEXT,
  oversight_notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_orgs_org_id_idx ON public.service_orgs(org_id);

ALTER TABLE public.service_orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_orgs_select" ON public.service_orgs
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "service_orgs_insert" ON public.service_orgs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "service_orgs_update" ON public.service_orgs
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "service_orgs_delete" ON public.service_orgs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

DROP TRIGGER IF EXISTS set_service_orgs_updated_at ON public.service_orgs;
CREATE TRIGGER set_service_orgs_updated_at
  BEFORE UPDATE ON public.service_orgs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SOC 1 report register
CREATE TABLE IF NOT EXISTS public.soc1_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_org_id UUID NOT NULL REFERENCES public.service_orgs(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'Type II',
  auditor TEXT,
  issued_at DATE,
  coverage_summary TEXT,
  testing_summary TEXT,
  control_deficiencies TEXT,
  document_storage_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS soc1_reports_service_org_idx ON public.soc1_reports(service_org_id);
CREATE INDEX IF NOT EXISTS soc1_reports_period_idx ON public.soc1_reports(service_org_id, period_end DESC);

ALTER TABLE public.soc1_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soc1_reports_select" ON public.soc1_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.is_member_of(so.org_id)
    )
  );

CREATE POLICY "soc1_reports_insert" ON public.soc1_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc1_reports_update" ON public.soc1_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc1_reports_delete" ON public.soc1_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

-- Complementary user entity controls (CUECs)
CREATE TABLE IF NOT EXISTS public.soc1_cuecs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_org_id UUID NOT NULL REFERENCES public.service_orgs(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.soc1_reports(id) ON DELETE SET NULL,
  control_reference TEXT,
  control_objective TEXT NOT NULL,
  description TEXT,
  control_owner TEXT,
  frequency TEXT,
  status TEXT NOT NULL DEFAULT 'not_started',
  testing_notes TEXT,
  last_tested_at DATE,
  tested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  exception_summary TEXT,
  remediation_plan TEXT,
  residual_risk TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('not_started', 'in_progress', 'effective', 'deficient'))
);

CREATE INDEX IF NOT EXISTS soc1_cuecs_service_org_idx ON public.soc1_cuecs(service_org_id);
CREATE INDEX IF NOT EXISTS soc1_cuecs_status_idx ON public.soc1_cuecs(service_org_id, status);

ALTER TABLE public.soc1_cuecs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soc1_cuecs_select" ON public.soc1_cuecs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.is_member_of(so.org_id)
    )
  );

CREATE POLICY "soc1_cuecs_insert" ON public.soc1_cuecs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc1_cuecs_update" ON public.soc1_cuecs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc1_cuecs_delete" ON public.soc1_cuecs
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

DROP TRIGGER IF EXISTS set_soc1_cuecs_updated_at ON public.soc1_cuecs;
CREATE TRIGGER set_soc1_cuecs_updated_at
  BEFORE UPDATE ON public.soc1_cuecs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Residual risk notes linked to CUECs
CREATE TABLE IF NOT EXISTS public.soc1_residual_risk_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_org_id UUID NOT NULL REFERENCES public.service_orgs(id) ON DELETE CASCADE,
  cuec_id UUID REFERENCES public.soc1_cuecs(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  risk_rating TEXT,
  follow_up_owner TEXT,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS soc1_residual_risk_org_idx ON public.soc1_residual_risk_notes(service_org_id);
CREATE INDEX IF NOT EXISTS soc1_residual_risk_cuec_idx ON public.soc1_residual_risk_notes(cuec_id);

ALTER TABLE public.soc1_residual_risk_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soc1_residual_risk_select" ON public.soc1_residual_risk_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.is_member_of(so.org_id)
    )
  );

CREATE POLICY "soc1_residual_risk_insert" ON public.soc1_residual_risk_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'EMPLOYEE')
    )
  );

CREATE POLICY "soc1_residual_risk_update" ON public.soc1_residual_risk_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc1_residual_risk_delete" ON public.soc1_residual_risk_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.service_orgs so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

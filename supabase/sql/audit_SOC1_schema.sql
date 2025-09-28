-- ===========================================================
-- SOC (merged) — service organisations, SOC reports, CUECs
-- ===========================================================

-- ---------- Enums (from main) ----------
CREATE TYPE IF NOT EXISTS public.service_org_type AS ENUM ('TYPE_1', 'TYPE_2');
CREATE TYPE IF NOT EXISTS public.soc_report_scope AS ENUM ('SOC1', 'SOC2', 'SOC3');
CREATE TYPE IF NOT EXISTS public.cuec_status AS ENUM ('NOT_ASSESSED', 'ADEQUATE', 'DEFICIENCY');

-- ===========================================================
-- Service organisations (main name) + codex oversight fields
-- ===========================================================
CREATE TABLE IF NOT EXISTS public.service_organisations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id      UUID NOT NULL REFERENCES public.engagements(id)   ON DELETE CASCADE,

  -- core (main)
  name               TEXT NOT NULL,
  description        TEXT,
  service_type       TEXT,
  reliance_assessed  BOOLEAN NOT NULL DEFAULT false,
  residual_risk      TEXT,

  -- oversight (from codex/*)
  industry           TEXT,
  control_owner      TEXT,
  contact_email      TEXT,
  contact_phone      TEXT,
  system_scope       TEXT,
  oversight_notes    TEXT,
  created_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_org_engagement
  ON public.service_organisations (org_id, engagement_id);
CREATE INDEX IF NOT EXISTS service_organisations_org_id_idx
  ON public.service_organisations (org_id);

ALTER TABLE public.service_organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_organisations_select" ON public.service_organisations
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "service_organisations_insert" ON public.service_organisations
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "service_organisations_update" ON public.service_organisations
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "service_organisations_delete" ON public.service_organisations
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

DROP TRIGGER IF EXISTS set_service_organisations_updated_at ON public.service_organisations;
CREATE TRIGGER set_service_organisations_updated_at
  BEFORE UPDATE ON public.service_organisations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==================================
-- SOC reports (unified & richer)
-- ==================================
CREATE TABLE IF NOT EXISTS public.soc_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id)      ON DELETE CASCADE,
  engagement_id    UUID NOT NULL REFERENCES public.engagements(id)        ON DELETE CASCADE,
  service_org_id   UUID NOT NULL REFERENCES public.service_organisations(id) ON DELETE CASCADE,

  report_type      public.service_org_type  NOT NULL DEFAULT 'TYPE_2',
  scope            public.soc_report_scope  NOT NULL DEFAULT 'SOC1',

  period_start     DATE,
  period_end       DATE,
  issued_at        DATE,
  auditor          TEXT,

  -- extra codex SOC1 detail
  coverage_summary       TEXT,
  testing_summary        TEXT,
  control_deficiencies   TEXT,
  document_storage_path  TEXT,
  uploaded_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (period_end IS NULL OR period_start IS NULL OR period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_soc_reports_service_org
  ON public.soc_reports (service_org_id);
CREATE INDEX IF NOT EXISTS idx_soc_reports_period
  ON public.soc_reports (service_org_id, period_end DESC);

ALTER TABLE public.soc_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soc_reports_select" ON public.soc_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.is_member_of(so.org_id)
    )
  );

CREATE POLICY "soc_reports_insert" ON public.soc_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc_reports_update" ON public.soc_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc_reports_delete" ON public.soc_reports
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

DROP TRIGGER IF EXISTS set_soc_reports_updated_at ON public.soc_reports;
CREATE TRIGGER set_soc_reports_updated_at
  BEFORE UPDATE ON public.soc_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==================================
-- CUEC controls (merged)
-- ==================================
CREATE TABLE IF NOT EXISTS public.cuec_controls (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES public.organizations(id)      ON DELETE CASCADE,
  engagement_id        UUID NOT NULL REFERENCES public.engagements(id)        ON DELETE CASCADE,
  service_org_id       UUID NOT NULL REFERENCES public.service_organisations(id) ON DELETE CASCADE,
  report_id            UUID REFERENCES public.soc_reports(id) ON DELETE SET NULL,

  -- main
  description          TEXT NOT NULL,
  status               public.cuec_status NOT NULL DEFAULT 'NOT_ASSESSED',
  tested               BOOLEAN NOT NULL DEFAULT false,
  exception_note       TEXT,
  compensating_control TEXT,

  -- codex extras for richer workflow
  control_reference    TEXT,
  control_objective    TEXT,
  control_owner        TEXT,
  frequency            TEXT,
  testing_notes        TEXT,
  last_tested_at       DATE,
  tested_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  exception_summary    TEXT,
  remediation_plan     TEXT,
  residual_risk        TEXT,

  -- optional fine-grained workflow state from codex
  workflow_status      TEXT
                         CHECK (workflow_status IS NULL OR workflow_status IN
                           ('not_started','in_progress','effective','deficient')),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cuec_service_org
  ON public.cuec_controls (service_org_id, status);
CREATE INDEX IF NOT EXISTS idx_cuec_report
  ON public.cuec_controls (report_id);

ALTER TABLE public.cuec_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cuec_controls_select" ON public.cuec_controls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.is_member_of(so.org_id)
    )
  );

CREATE POLICY "cuec_controls_insert" ON public.cuec_controls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "cuec_controls_update" ON public.cuec_controls
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "cuec_controls_delete" ON public.cuec_controls
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

DROP TRIGGER IF EXISTS set_cuec_controls_updated_at ON public.cuec_controls;
CREATE TRIGGER set_cuec_controls_updated_at
  BEFORE UPDATE ON public.cuec_controls
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==================================
-- Residual risk notes (codex, unified)
-- ==================================
CREATE TABLE IF NOT EXISTS public.soc_residual_risk_notes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id)      ON DELETE CASCADE,
  engagement_id    UUID REFERENCES public.engagements(id)                 ON DELETE CASCADE,
  service_org_id   UUID NOT NULL REFERENCES public.service_organisations(id) ON DELETE CASCADE,
  cuec_id          UUID REFERENCES public.cuec_controls(id)               ON DELETE SET NULL,
  note             TEXT NOT NULL,
  risk_rating      TEXT,
  follow_up_owner  TEXT,
  logged_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS soc_residual_risk_org_idx
  ON public.soc_residual_risk_notes(service_org_id);
CREATE INDEX IF NOT EXISTS soc_residual_risk_cuec_idx
  ON public.soc_residual_risk_notes(cuec_id);

ALTER TABLE public.soc_residual_risk_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "soc_residual_risk_select" ON public.soc_residual_risk_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.is_member_of(so.org_id)
    )
  );

CREATE POLICY "soc_residual_risk_insert" ON public.soc_residual_risk_notes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'EMPLOYEE')
    )
  );

CREATE POLICY "soc_residual_risk_update" ON public.soc_residual_risk_notes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

CREATE POLICY "soc_residual_risk_delete" ON public.soc_residual_risk_notes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.service_organisations so
      WHERE so.id = service_org_id
        AND public.has_min_role(so.org_id, 'MANAGER')
    )
  );

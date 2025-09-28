-- Advanced accounting module schema with RLS protections

-- Trace events for accounting orchestration
CREATE TABLE IF NOT EXISTS public.accounting_trace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approvals JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_trace_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_trace_events_read" ON public.accounting_trace_events
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_trace_events_write" ON public.accounting_trace_events
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

-- Consolidation runs
CREATE TABLE IF NOT EXISTS public.accounting_consolidation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  entity_scope JSONB DEFAULT '[]'::jsonb,
  control_checks JSONB DEFAULT '{}'::jsonb,
  adjustments JSONB DEFAULT '{}'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_consolidation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_consolidation_runs_read" ON public.accounting_consolidation_runs
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_consolidation_runs_write" ON public.accounting_consolidation_runs
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_consolidation_runs_updated_at
  BEFORE UPDATE ON public.accounting_consolidation_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Revenue contracts
CREATE TABLE IF NOT EXISTS public.accounting_revenue_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  recognition_pattern TEXT NOT NULL DEFAULT 'over_time',
  consideration NUMERIC(14,2) NOT NULL DEFAULT 0,
  performance_obligations JSONB DEFAULT '[]'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_revenue_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_revenue_contracts_read" ON public.accounting_revenue_contracts
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_revenue_contracts_write" ON public.accounting_revenue_contracts
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_revenue_contracts_updated_at
  BEFORE UPDATE ON public.accounting_revenue_contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Lease measurements
CREATE TABLE IF NOT EXISTS public.accounting_lease_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lease_code TEXT NOT NULL,
  asset_class TEXT NOT NULL,
  commencement_date DATE NOT NULL,
  term_months INTEGER NOT NULL,
  discount_rate NUMERIC(6,4) DEFAULT 0.0000,
  cash_flows JSONB DEFAULT '[]'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_lease_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_lease_measurements_read" ON public.accounting_lease_measurements
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_lease_measurements_write" ON public.accounting_lease_measurements
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_lease_measurements_updated_at
  BEFORE UPDATE ON public.accounting_lease_measurements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Financial instruments / ECL runs
CREATE TABLE IF NOT EXISTS public.accounting_ecl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  portfolio_name TEXT NOT NULL,
  staging_summary JSONB DEFAULT '{}'::jsonb,
  exposure_at_default NUMERIC(16,2) NOT NULL DEFAULT 0,
  probability_of_default NUMERIC(6,4) NOT NULL DEFAULT 0,
  loss_given_default NUMERIC(6,4) NOT NULL DEFAULT 0,
  expected_loss NUMERIC(16,2) NOT NULL DEFAULT 0,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_ecl_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_ecl_runs_read" ON public.accounting_ecl_runs
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_ecl_runs_write" ON public.accounting_ecl_runs
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_ecl_runs_updated_at
  BEFORE UPDATE ON public.accounting_ecl_runs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Impairment tests
CREATE TABLE IF NOT EXISTS public.accounting_impairment_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cgu_name TEXT NOT NULL,
  carrying_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  recoverable_amount NUMERIC(16,2) NOT NULL DEFAULT 0,
  assumptions JSONB DEFAULT '{}'::jsonb,
  sensitivity_analysis JSONB DEFAULT '{}'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_impairment_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_impairment_tests_read" ON public.accounting_impairment_tests
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_impairment_tests_write" ON public.accounting_impairment_tests
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_impairment_tests_updated_at
  BEFORE UPDATE ON public.accounting_impairment_tests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Income tax packs
CREATE TABLE IF NOT EXISTS public.accounting_tax_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  reporting_period TEXT NOT NULL,
  effective_tax_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  adjustments JSONB DEFAULT '{}'::jsonb,
  disclosures JSONB DEFAULT '{}'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_tax_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_tax_packs_read" ON public.accounting_tax_packs
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_tax_packs_write" ON public.accounting_tax_packs
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_tax_packs_updated_at
  BEFORE UPDATE ON public.accounting_tax_packs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Cash flow builder
CREATE TABLE IF NOT EXISTS public.accounting_cash_flow_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reporting_period TEXT NOT NULL,
  methodology TEXT NOT NULL DEFAULT 'indirect',
  operating_section JSONB DEFAULT '{}'::jsonb,
  investing_section JSONB DEFAULT '{}'::jsonb,
  financing_section JSONB DEFAULT '{}'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_cash_flow_blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_cash_flow_blueprints_read" ON public.accounting_cash_flow_blueprints
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_cash_flow_blueprints_write" ON public.accounting_cash_flow_blueprints
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_cash_flow_blueprints_updated_at
  BEFORE UPDATE ON public.accounting_cash_flow_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Disclosure composer
CREATE TABLE IF NOT EXISTS public.accounting_disclosure_composer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  note_reference TEXT NOT NULL,
  topic TEXT NOT NULL,
  draft_content TEXT NOT NULL,
  data_sources JSONB DEFAULT '[]'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_disclosure_composer ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_disclosure_composer_read" ON public.accounting_disclosure_composer
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_disclosure_composer_write" ON public.accounting_disclosure_composer
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_disclosure_composer_updated_at
  BEFORE UPDATE ON public.accounting_disclosure_composer
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ESEF tagging / exporter
CREATE TABLE IF NOT EXISTS public.accounting_esef_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  filing_period TEXT NOT NULL,
  taxonomy_version TEXT NOT NULL,
  export_status TEXT NOT NULL DEFAULT 'draft',
  warnings JSONB DEFAULT '[]'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_esef_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_esef_exports_read" ON public.accounting_esef_exports
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_esef_exports_write" ON public.accounting_esef_exports
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_esef_exports_updated_at
  BEFORE UPDATE ON public.accounting_esef_exports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- GAPSME / basis switcher
CREATE TABLE IF NOT EXISTS public.accounting_basis_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_framework TEXT NOT NULL,
  target_framework TEXT NOT NULL,
  effective_date DATE NOT NULL,
  adjustments JSONB DEFAULT '{}'::jsonb,
  disclosures JSONB DEFAULT '{}'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_basis_switches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_basis_switches_read" ON public.accounting_basis_switches
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_basis_switches_write" ON public.accounting_basis_switches
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_basis_switches_updated_at
  BEFORE UPDATE ON public.accounting_basis_switches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Industry toggles
CREATE TABLE IF NOT EXISTS public.accounting_industry_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  industries JSONB DEFAULT '[]'::jsonb,
  toggles JSONB DEFAULT '[]'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_industry_toggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_industry_toggles_read" ON public.accounting_industry_toggles
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_industry_toggles_write" ON public.accounting_industry_toggles
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_industry_toggles_updated_at
  BEFORE UPDATE ON public.accounting_industry_toggles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Specialised packs
CREATE TABLE IF NOT EXISTS public.accounting_specialised_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  industry TEXT NOT NULL,
  pack_name TEXT NOT NULL,
  questionnaire JSONB DEFAULT '[]'::jsonb,
  analytics JSONB DEFAULT '{}'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_specialised_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_specialised_packs_read" ON public.accounting_specialised_packs
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_specialised_packs_write" ON public.accounting_specialised_packs
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_specialised_packs_updated_at
  BEFORE UPDATE ON public.accounting_specialised_packs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Governance telemetry
CREATE TABLE IF NOT EXISTS public.accounting_governance_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  signal_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  module TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  payload JSONB DEFAULT '{}'::jsonb,
  approval_snapshot JSONB DEFAULT '[]'::jsonb,
  trace_id UUID REFERENCES public.accounting_trace_events(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounting_governance_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accounting_governance_telemetry_read" ON public.accounting_governance_telemetry
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_governance_telemetry_write" ON public.accounting_governance_telemetry
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_governance_telemetry_updated_at
  BEFORE UPDATE ON public.accounting_governance_telemetry
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

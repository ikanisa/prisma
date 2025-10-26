BEGIN;

-- Ensure enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dac6_hallmark_category') THEN
    CREATE TYPE public.dac6_hallmark_category AS ENUM ('A', 'B', 'C', 'D', 'E');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dac6_submission_status') THEN
    CREATE TYPE public.dac6_submission_status AS ENUM ('DRAFT', 'READY_FOR_SUBMISSION', 'SUBMITTED', 'REJECTED');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_dispute_status') THEN
    CREATE TYPE public.tax_dispute_status AS ENUM ('OPEN', 'IN_PROGRESS', 'SUBMITTED', 'RESOLVED', 'CLOSED');
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'us_overlay_type') THEN
    CREATE TYPE public.us_overlay_type AS ENUM ('GILTI', '163J', 'CAMT', 'EXCISE_4501');
  END IF;
END;
$$;

-- Core calculator tables
CREATE TABLE IF NOT EXISTS public.nid_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  equity_base NUMERIC(18,2) NOT NULL,
  risk_free_rate NUMERIC(10,6) DEFAULT 0,
  risk_premium NUMERIC(10,6) DEFAULT 0.05,
  reference_rate NUMERIC(10,6) NOT NULL,
  prior_deduction NUMERIC(18,2) DEFAULT 0,
  chargeable_income_before_nid NUMERIC(18,2),
  cap_ratio NUMERIC(5,4) DEFAULT 0.9,
  gross_deduction NUMERIC(18,2) NOT NULL,
  capped_deduction NUMERIC(18,2) NOT NULL,
  deduction_after_carryforward NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nid_computations_org_period
  ON public.nid_computations(org_id, tax_entity_id, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_nid_computations_touch'
      AND tgrelid = 'public.nid_computations'::regclass
  ) THEN
    CREATE TRIGGER trg_nid_computations_touch
      BEFORE UPDATE ON public.nid_computations
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.patent_box_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  qualifying_ip_income NUMERIC(18,2) NOT NULL,
  qualifying_expenditure NUMERIC(18,2) NOT NULL,
  overall_expenditure NUMERIC(18,2) NOT NULL,
  routine_return_rate NUMERIC(10,6) DEFAULT 0.1,
  uplift_cap NUMERIC(10,6) DEFAULT 0.3,
  deduction_rate NUMERIC(10,6) DEFAULT 0.95,
  routine_return NUMERIC(18,2) NOT NULL,
  uplift NUMERIC(18,2) NOT NULL,
  nexus_fraction NUMERIC(10,6) NOT NULL,
  deduction_base NUMERIC(18,2) NOT NULL,
  deduction_amount NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patent_box_computations_org_period
  ON public.patent_box_computations(org_id, tax_entity_id, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_patent_box_computations_touch'
      AND tgrelid = 'public.patent_box_computations'::regclass
  ) THEN
    CREATE TRIGGER trg_patent_box_computations_touch
      BEFORE UPDATE ON public.patent_box_computations
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.interest_limitation_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  exceeding_borrowing_costs NUMERIC(18,2) NOT NULL,
  tax_ebitda NUMERIC(18,2) NOT NULL,
  standalone_allowance NUMERIC(18,2) DEFAULT 0,
  safe_harbour_amount NUMERIC(18,2) DEFAULT 3000000,
  carryforward_interest NUMERIC(18,2) DEFAULT 0,
  carryforward_capacity NUMERIC(18,2) DEFAULT 0,
  disallowed_carryforward NUMERIC(18,2) DEFAULT 0,
  allowed_interest NUMERIC(18,2) NOT NULL,
  disallowed_interest NUMERIC(18,2) NOT NULL,
  updated_carryforward_interest NUMERIC(18,2) NOT NULL,
  updated_carryforward_capacity NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interest_limitation_org_period
  ON public.interest_limitation_computations(org_id, tax_entity_id, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_interest_limitation_touch'
      AND tgrelid = 'public.interest_limitation_computations'::regclass
  ) THEN
    CREATE TRIGGER trg_interest_limitation_touch
      BEFORE UPDATE ON public.interest_limitation_computations
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.cfc_inclusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  cfc_entity_name TEXT,
  cfc_profit NUMERIC(18,2) NOT NULL,
  foreign_tax_paid NUMERIC(18,2) NOT NULL,
  foreign_rate NUMERIC(10,6) DEFAULT 0,
  domestic_rate NUMERIC(10,6) DEFAULT 0.35,
  participation_percentage NUMERIC(5,4) DEFAULT 1,
  profit_attribution_ratio NUMERIC(5,4) DEFAULT 1,
  inclusion_amount NUMERIC(18,2) NOT NULL,
  tax_credit_eligible NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cfc_inclusions_org_period
  ON public.cfc_inclusions(org_id, tax_entity_id, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_cfc_inclusions_touch'
      AND tgrelid = 'public.cfc_inclusions'::regclass
  ) THEN
    CREATE TRIGGER trg_cfc_inclusions_touch
      BEFORE UPDATE ON public.cfc_inclusions
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.fiscal_unity_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  members JSONB NOT NULL,
  total_chargeable_income NUMERIC(18,2) NOT NULL,
  total_adjustments NUMERIC(18,2) NOT NULL,
  tax_rate NUMERIC(10,6) NOT NULL,
  consolidated_cit NUMERIC(18,2) NOT NULL,
  total_tax_credits NUMERIC(18,2) NOT NULL,
  net_tax_payable NUMERIC(18,2) NOT NULL,
  closing_tax_account NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_unity_org_period
  ON public.fiscal_unity_computations(org_id, parent_tax_entity_id, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_fiscal_unity_touch'
      AND tgrelid = 'public.fiscal_unity_computations'::regclass
  ) THEN
    CREATE TRIGGER trg_fiscal_unity_touch
      BEFORE UPDATE ON public.fiscal_unity_computations
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.vat_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  taxable_outputs NUMERIC(18,2) NOT NULL,
  output_vat NUMERIC(18,2) NOT NULL,
  input_vat NUMERIC(18,2) NOT NULL,
  net_vat_due NUMERIC(18,2) NOT NULL,
  manual_adjustments NUMERIC(18,2) NOT NULL,
  net_payable_after_adjustments NUMERIC(18,2) NOT NULL,
  adjustment_amount NUMERIC(18,2) NOT NULL,
  payload JSONB NOT NULL,
  filing_type TEXT NOT NULL DEFAULT 'VAT',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vat_filings_org_period
  ON public.vat_filings(org_id, tax_entity_id, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_vat_filings_touch'
      AND tgrelid = 'public.vat_filings'::regclass
  ) THEN
    CREATE TRIGGER trg_vat_filings_touch
      BEFORE UPDATE ON public.vat_filings
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

-- DAC6
CREATE TABLE IF NOT EXISTS public.dac6_arrangements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  reference TEXT NOT NULL,
  description TEXT,
  first_step_date DATE,
  disclosure_due_date DATE,
  status public.dac6_submission_status NOT NULL DEFAULT 'DRAFT',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dac6_arrangements_org_status
  ON public.dac6_arrangements(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dac6_hallmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES public.dac6_arrangements(id) ON DELETE CASCADE,
  category public.dac6_hallmark_category NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  main_benefit_test BOOLEAN DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dac6_hallmarks_arrangement
  ON public.dac6_hallmarks(arrangement_id);

CREATE TABLE IF NOT EXISTS public.dac6_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES public.dac6_arrangements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  jurisdiction TEXT,
  tin TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dac6_participants_arrangement
  ON public.dac6_participants(arrangement_id);

CREATE TABLE IF NOT EXISTS public.dac6_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrangement_id UUID NOT NULL REFERENCES public.dac6_arrangements(id) ON DELETE CASCADE,
  submission_reference TEXT,
  submitted_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dac6_filings_arrangement
  ON public.dac6_filings(arrangement_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_dac6_arrangements_touch'
      AND tgrelid = 'public.dac6_arrangements'::regclass
  ) THEN
    CREATE TRIGGER trg_dac6_arrangements_touch
      BEFORE UPDATE ON public.dac6_arrangements
      FOR EACH ROW
      EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

-- Pillar Two
CREATE TABLE IF NOT EXISTS public.tax_entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  child_tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  ownership_percentage NUMERIC(5,4) NOT NULL DEFAULT 1,
  effective_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tax_entity_relationships_distinct_pair CHECK (parent_tax_entity_id <> child_tax_entity_id),
  CONSTRAINT tax_entity_relationships_unique UNIQUE (org_id, parent_tax_entity_id, child_tax_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_tax_entity_relationships_org_parent
  ON public.tax_entity_relationships(org_id, parent_tax_entity_id);

CREATE INDEX IF NOT EXISTS idx_tax_entity_relationships_child
  ON public.tax_entity_relationships(child_tax_entity_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_tax_entity_relationships_touch'
      AND tgrelid = 'public.tax_entity_relationships'::regclass
  ) THEN
    CREATE TRIGGER trg_tax_entity_relationships_touch
      BEFORE UPDATE ON public.tax_entity_relationships
      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.pillar_two_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  root_tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  gir_reference TEXT,
  jurisdiction_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  gir_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_top_up_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  qdmt_top_up_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  iir_top_up_tax NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pillar_two_computations_org_period
  ON public.pillar_two_computations(org_id, period);

CREATE INDEX IF NOT EXISTS idx_pillar_two_computations_root
  ON public.pillar_two_computations(root_tax_entity_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_pillar_two_computations_touch'
      AND tgrelid = 'public.pillar_two_computations'::regclass
  ) THEN
    CREATE TRIGGER trg_pillar_two_computations_touch
      BEFORE UPDATE ON public.pillar_two_computations
      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

INSERT INTO public.activity_event_catalog (action, description, module, policy_pack, standard_refs, severity)
VALUES
  ('PILLAR_TWO_COMPUTED', 'Pillar Two top-up tax computed and GIR snapshot stored.', 'TAX_PILLAR_TWO', 'T-GOV-1', ARRAY['OECD GloBE Rules'], 'INFO')
ON CONFLICT (action) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  policy_pack = EXCLUDED.policy_pack,
  standard_refs = EXCLUDED.standard_refs,
  severity = EXCLUDED.severity;

-- Treaty WHT & disputes
CREATE TABLE IF NOT EXISTS public.treaty_wht_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  counterparty_jurisdiction TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  treaty_article TEXT,
  domestic_rate NUMERIC(6,4) NOT NULL,
  treaty_rate NUMERIC(6,4) NOT NULL,
  gross_amount NUMERIC(18,2) NOT NULL,
  withholding_before NUMERIC(18,2) NOT NULL,
  withholding_after NUMERIC(18,2) NOT NULL,
  relief_amount NUMERIC(18,2) NOT NULL,
  relief_method TEXT NOT NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treaty_wht_org_period
  ON public.treaty_wht_calculations(org_id, tax_entity_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_treaty_wht_touch'
      AND tgrelid = 'public.treaty_wht_calculations'::regclass
  ) THEN
    CREATE TRIGGER trg_treaty_wht_touch
      BEFORE UPDATE ON public.treaty_wht_calculations
      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tax_dispute_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  case_type TEXT NOT NULL CHECK (case_type IN ('MAP', 'APA')),
  counterparty_jurisdiction TEXT NOT NULL,
  counterparty_authority TEXT,
  case_reference TEXT,
  status public.tax_dispute_status NOT NULL DEFAULT 'OPEN',
  opened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_resolution DATE,
  relief_amount NUMERIC(18,2),
  issue_summary TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_dispute_cases_org_status
  ON public.tax_dispute_cases(org_id, status, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_tax_dispute_cases_touch'
      AND tgrelid = 'public.tax_dispute_cases'::regclass
  ) THEN
    CREATE TRIGGER trg_tax_dispute_cases_touch
      BEFORE UPDATE ON public.tax_dispute_cases
      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tax_dispute_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispute_id UUID NOT NULL REFERENCES public.tax_dispute_cases(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_dispute_events_dispute_date
  ON public.tax_dispute_events(dispute_id, event_date DESC);

INSERT INTO public.activity_event_catalog (action, description, module, policy_pack, standard_refs, severity) VALUES
  ('TREATY_WHT_COMPUTED', 'Treaty withholding reconciliation computed and stored.', 'TAX_TREATY_WHT', 'T-GOV-1', ARRAY['OECD Treaty Model'], 'INFO'),
  ('TAX_DISPUTE_EVENT_LOGGED', 'Dispute timeline event logged for MAP/APA case.', 'TAX_TREATY_WHT', 'T-GOV-1', ARRAY['OECD MAP Manual'], 'INFO')
ON CONFLICT (action) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  policy_pack = EXCLUDED.policy_pack,
  standard_refs = EXCLUDED.standard_refs,
  severity = EXCLUDED.severity;

-- US overlays
CREATE TABLE IF NOT EXISTS public.us_tax_overlay_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  overlay_type public.us_overlay_type NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  adjustment_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_us_tax_overlay_org_type
  ON public.us_tax_overlay_calculations(org_id, overlay_type, period);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_us_tax_overlay_touch'
      AND tgrelid = 'public.us_tax_overlay_calculations'::regclass
  ) THEN
    CREATE TRIGGER trg_us_tax_overlay_touch
      BEFORE UPDATE ON public.us_tax_overlay_calculations
      FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
  END IF;
END;
$$;

INSERT INTO public.activity_event_catalog (action, description, module, policy_pack, standard_refs, severity) VALUES
  ('US_GILTI_COMPUTED', 'GILTI inclusion calculated and stored.', 'TAX_US_OVERLAY', 'T-GOV-1', ARRAY['IRC §951A'], 'INFO'),
  ('US_163J_COMPUTED', '§163(j) interest limitation computed.', 'TAX_US_OVERLAY', 'T-GOV-1', ARRAY['IRC §163(j)'], 'INFO'),
  ('US_CAMT_COMPUTED', 'Corporate alternative minimum tax calculated.', 'TAX_US_OVERLAY', 'T-GOV-1', ARRAY['IRC §55'], 'INFO'),
  ('US_4501_COMPUTED', 'Stock repurchase excise tax determined.', 'TAX_US_OVERLAY', 'T-GOV-1', ARRAY['IRC §4501'], 'INFO')
ON CONFLICT (action) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  policy_pack = EXCLUDED.policy_pack,
  standard_refs = EXCLUDED.standard_refs,
  severity = EXCLUDED.severity;

COMMIT;

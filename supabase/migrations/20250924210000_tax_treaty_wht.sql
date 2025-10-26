-- Treaty WHT computations and dispute tracking (T-3A)
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_dispute_status') THEN
    CREATE TYPE public.tax_dispute_status AS ENUM ('OPEN', 'IN_PROGRESS', 'SUBMITTED', 'RESOLVED', 'CLOSED');
  END IF;
END;
$$;

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

COMMIT;

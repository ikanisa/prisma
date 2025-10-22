-- US tax overlays (T-3B)
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'us_overlay_type') THEN
    CREATE TYPE public.us_overlay_type AS ENUM ('GILTI', '163J', 'CAMT', 'EXCISE_4501');
  END IF;
END;
$$;

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

CREATE TRIGGER trg_us_tax_overlay_touch
  BEFORE UPDATE ON public.us_tax_overlay_calculations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

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

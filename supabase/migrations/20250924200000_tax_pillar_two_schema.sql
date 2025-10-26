-- Pillar Two schema (T-2C)
BEGIN;

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

COMMIT;

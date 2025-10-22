-- Malta CIT & tax accounts schema (T-1A)
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'tax_account_type'
      AND t.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.tax_account_type AS ENUM (
      'MTA',
      'FIA',
      'IPA',
      'FTA',
      'UA'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'cit_refund_profile'
      AND t.typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.cit_refund_profile AS ENUM (
      '6_7',
      '5_7',
      '2_3',
      'NONE'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tax_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'MT',
  fiscal_year TEXT NOT NULL,
  fiscal_start DATE,
  fiscal_end DATE,
  listed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_entities_org_year ON public.tax_entities(org_id, fiscal_year, name);

CREATE TABLE IF NOT EXISTS public.tax_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  account_type public.tax_account_type NOT NULL,
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  movements JSONB NOT NULL DEFAULT '[]'::jsonb,
  closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tax_accounts_unique UNIQUE (org_id, tax_entity_id, account_type)
);

DROP TABLE IF EXISTS public.cit_computations CASCADE;

CREATE TABLE IF NOT EXISTS public.cit_computations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  tb_snapshot_id UUID,
  adjustments JSONB NOT NULL DEFAULT '[]'::jsonb,
  pre_tax_profit NUMERIC(18,2) NOT NULL DEFAULT 0,
  chargeable_income NUMERIC(18,2) NOT NULL DEFAULT 0,
  cit_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  participation_exempt BOOLEAN NOT NULL DEFAULT false,
  refund_profile public.cit_refund_profile NOT NULL DEFAULT 'NONE',
  refund_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cit_computations_entity_period ON public.cit_computations(tax_entity_id, period);

CREATE TABLE IF NOT EXISTS public.participation_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  event_ref TEXT,
  tests JSONB NOT NULL DEFAULT '{}'::jsonb,
  conclusion BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.return_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tax_entity_id UUID NOT NULL REFERENCES public.tax_entities(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  document_id UUID,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ
);

DROP INDEX IF EXISTS idx_return_files_unique_period;
CREATE UNIQUE INDEX IF NOT EXISTS idx_return_files_unique_period ON public.return_files(org_id, tax_entity_id, period, kind);

CREATE TRIGGER trg_tax_entities_touch
  BEFORE UPDATE ON public.tax_entities
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_tax_accounts_touch
  BEFORE UPDATE ON public.tax_accounts
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_cit_computations_touch
  BEFORE UPDATE ON public.cit_computations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

COMMIT;

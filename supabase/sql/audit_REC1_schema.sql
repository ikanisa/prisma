-- REC1 reconciliation schema covering bank, AR, and AP workflows with evidence hooks

-- Enumerations for reconciliation domain
DO $$
BEGIN
  CREATE TYPE public.reconciliation_type AS ENUM ('BANK', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_statement_side AS ENUM ('LEDGER', 'EXTERNAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_status AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_match_strategy AS ENUM ('AMOUNT_AND_DATE', 'AMOUNT_ONLY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_item_status AS ENUM ('OUTSTANDING', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_item_origin AS ENUM ('AUTOMATCH', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.reconciliation_evidence_type AS ENUM ('SUPPORT', 'MISSTATEMENT', 'FOLLOW_UP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Master reconciliation record
CREATE TABLE IF NOT EXISTS public.audit_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  control_reference TEXT,
  type public.reconciliation_type NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.reconciliation_status NOT NULL DEFAULT 'OPEN',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_matched_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT audit_reconciliations_period_chk CHECK (period_end >= period_start)
);

CREATE UNIQUE INDEX IF NOT EXISTS audit_reconciliations_id_org_idx
  ON public.audit_reconciliations(id, org_id);
CREATE INDEX IF NOT EXISTS audit_reconciliations_org_idx
  ON public.audit_reconciliations(org_id);
CREATE INDEX IF NOT EXISTS audit_reconciliations_status_idx
  ON public.audit_reconciliations(status);

-- Imported statement headers for both ledger and external sources
CREATE TABLE IF NOT EXISTS public.audit_reconciliation_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.audit_reconciliations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  side public.reconciliation_statement_side NOT NULL,
  source_name TEXT,
  statement_date DATE,
  imported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ DEFAULT now(),
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT audit_recon_statements_org_match FOREIGN KEY (reconciliation_id, org_id)
    REFERENCES public.audit_reconciliations(id, org_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS audit_recon_statements_id_org_idx
  ON public.audit_reconciliation_statements(id, org_id);
CREATE INDEX IF NOT EXISTS audit_recon_statements_recon_idx
  ON public.audit_reconciliation_statements(reconciliation_id);
CREATE INDEX IF NOT EXISTS audit_recon_statements_side_idx
  ON public.audit_reconciliation_statements(side);

-- Normalised statement line items used for matching
CREATE TABLE IF NOT EXISTS public.audit_reconciliation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL,
  reconciliation_id UUID NOT NULL,
  org_id UUID NOT NULL,
  side public.reconciliation_statement_side NOT NULL,
  line_date DATE,
  description TEXT,
  reference TEXT,
  amount NUMERIC(14,2) NOT NULL,
  line_hash TEXT,
  match_group_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT audit_recon_lines_amount_chk CHECK (amount <> 0),
  CONSTRAINT audit_recon_lines_org_fk FOREIGN KEY (statement_id, org_id)
    REFERENCES public.audit_reconciliation_statements(id, org_id) ON DELETE CASCADE,
  CONSTRAINT audit_recon_lines_recon_fk FOREIGN KEY (reconciliation_id, org_id)
    REFERENCES public.audit_reconciliations(id, org_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS audit_recon_lines_statement_idx
  ON public.audit_reconciliation_lines(statement_id);
CREATE INDEX IF NOT EXISTS audit_recon_lines_recon_idx
  ON public.audit_reconciliation_lines(reconciliation_id);
CREATE INDEX IF NOT EXISTS audit_recon_lines_side_idx
  ON public.audit_reconciliation_lines(side);

-- Deterministic match groupings
CREATE TABLE IF NOT EXISTS public.audit_reconciliation_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL,
  org_id UUID NOT NULL,
  strategy public.reconciliation_match_strategy NOT NULL,
  ledger_line_ids UUID[] NOT NULL,
  external_line_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT audit_recon_matches_recon_fk FOREIGN KEY (reconciliation_id, org_id)
    REFERENCES public.audit_reconciliations(id, org_id) ON DELETE CASCADE,
  CONSTRAINT audit_recon_matches_ledger_chk CHECK (cardinality(ledger_line_ids) > 0),
  CONSTRAINT audit_recon_matches_external_chk CHECK (cardinality(external_line_ids) > 0)
);

CREATE INDEX IF NOT EXISTS audit_recon_matches_recon_idx
  ON public.audit_reconciliation_matches(reconciliation_id);
CREATE INDEX IF NOT EXISTS audit_recon_matches_strategy_idx
  ON public.audit_reconciliation_matches(strategy);

-- Outstanding reconciliation items requiring resolution or misstatement capture
CREATE TABLE IF NOT EXISTS public.audit_reconciling_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL,
  org_id UUID NOT NULL,
  source_line_ids UUID[] DEFAULT ARRAY[]::UUID[],
  side public.reconciliation_statement_side NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  reason TEXT NOT NULL,
  origin public.reconciliation_item_origin NOT NULL DEFAULT 'AUTOMATCH',
  status public.reconciliation_item_status NOT NULL DEFAULT 'OUTSTANDING',
  is_misstatement BOOLEAN DEFAULT false,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  follow_up_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT audit_recon_items_amount_chk CHECK (amount <> 0),
  CONSTRAINT audit_recon_items_recon_fk FOREIGN KEY (reconciliation_id, org_id)
    REFERENCES public.audit_reconciliations(id, org_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS audit_recon_items_recon_idx
  ON public.audit_reconciling_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS audit_recon_items_status_idx
  ON public.audit_reconciling_items(status);
CREATE INDEX IF NOT EXISTS audit_recon_items_side_idx
  ON public.audit_reconciling_items(side);

-- Evidence hooks connecting reconciliations and items to supporting documents or follow-ups
CREATE TABLE IF NOT EXISTS public.audit_reconciliation_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL,
  org_id UUID NOT NULL,
  item_id UUID REFERENCES public.audit_reconciling_items(id) ON DELETE SET NULL,
  evidence_type public.reconciliation_evidence_type NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  reference_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT audit_recon_evidence_recon_fk FOREIGN KEY (reconciliation_id, org_id)
    REFERENCES public.audit_reconciliations(id, org_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS audit_recon_evidence_recon_idx
  ON public.audit_reconciliation_evidence(reconciliation_id);
CREATE INDEX IF NOT EXISTS audit_recon_evidence_item_idx
  ON public.audit_reconciliation_evidence(item_id);
CREATE INDEX IF NOT EXISTS audit_recon_evidence_type_idx
  ON public.audit_reconciliation_evidence(evidence_type);

-- Back-fill match references on lines
ALTER TABLE public.audit_reconciliation_lines
  ADD CONSTRAINT audit_recon_lines_match_fk FOREIGN KEY (match_group_id)
    REFERENCES public.audit_reconciliation_matches(id) ON DELETE SET NULL;

-- Row Level Security policies scoped by organization
ALTER TABLE public.audit_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reconciliation_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reconciliation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reconciliation_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reconciling_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_reconciliation_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_reconciliations_select ON public.audit_reconciliations
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY audit_reconciliations_write ON public.audit_reconciliations
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_recon_statements_select ON public.audit_reconciliation_statements
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY audit_recon_statements_write ON public.audit_reconciliation_statements
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_recon_lines_select ON public.audit_reconciliation_lines
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY audit_recon_lines_write ON public.audit_reconciliation_lines
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_recon_matches_select ON public.audit_reconciliation_matches
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY audit_recon_matches_write ON public.audit_reconciliation_matches
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_recon_items_select ON public.audit_reconciling_items
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY audit_recon_items_write ON public.audit_reconciling_items
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_recon_evidence_select ON public.audit_reconciliation_evidence
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY audit_recon_evidence_write ON public.audit_reconciliation_evidence
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));

-- Updated-at triggers for mutable tables
CREATE TRIGGER audit_reconciliations_updated_at
  BEFORE UPDATE ON public.audit_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER audit_recon_statements_updated_at
  BEFORE UPDATE ON public.audit_reconciliation_statements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER audit_recon_lines_updated_at
  BEFORE UPDATE ON public.audit_reconciliation_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER audit_recon_items_updated_at
  BEFORE UPDATE ON public.audit_reconciling_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

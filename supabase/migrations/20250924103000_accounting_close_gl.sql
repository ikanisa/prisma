BEGIN;

CREATE TYPE IF NOT EXISTS public.ledger_account_type AS ENUM (
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE'
);

CREATE TYPE IF NOT EXISTS public.close_period_status AS ENUM (
  'OPEN',
  'SUBSTANTIVE_REVIEW',
  'READY_TO_LOCK',
  'LOCKED'
);

CREATE TYPE IF NOT EXISTS public.reconciliation_type AS ENUM (
  'BANK',
  'AR',
  'AP',
  'GRNI',
  'PAYROLL',
  'OTHER'
);

CREATE TYPE IF NOT EXISTS public.reconciliation_item_category AS ENUM (
  'DIT',
  'OC',
  'UNAPPLIED_RECEIPT',
  'UNAPPLIED_PAYMENT',
  'TIMING',
  'ERROR',
  'OTHER'
);

CREATE TYPE IF NOT EXISTS public.je_control_rule AS ENUM (
  'LATE_POSTING',
  'WEEKEND_USER',
  'ROUND_AMOUNT',
  'MANUAL_TO_SENSITIVE',
  'MISSING_ATTACHMENT'
);

CREATE TYPE IF NOT EXISTS public.je_control_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type public.ledger_account_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  active BOOLEAN NOT NULL DEFAULT true,
  parent_account_id UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, entity_id, code)
);

CREATE TABLE IF NOT EXISTS public.journal_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  period_id UUID,
  reference TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  period_id UUID,
  entry_date DATE NOT NULL,
  account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
  description TEXT,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  fx_rate NUMERIC(18,8),
  source TEXT NOT NULL DEFAULT 'IMPORT',
  batch_id UUID REFERENCES public.journal_batches(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trial_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  period_id UUID,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_debits NUMERIC(18,2) NOT NULL,
  total_credits NUMERIC(18,2) NOT NULL,
  balances JSONB NOT NULL DEFAULT '{}'::jsonb,
  locked BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.close_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status public.close_period_status NOT NULL DEFAULT 'OPEN',
  locked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, entity_id, name)
);

CREATE TABLE IF NOT EXISTS public.close_pbc_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  period_id UUID REFERENCES public.close_periods(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  title TEXT NOT NULL,
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  document_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  period_id UUID REFERENCES public.close_periods(id) ON DELETE CASCADE,
  type public.reconciliation_type NOT NULL,
  control_account_id UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  gl_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  external_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  schedule_document_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL REFERENCES public.reconciliations(id) ON DELETE CASCADE,
  category public.reconciliation_item_category NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  reference TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fs_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  basis TEXT NOT NULL DEFAULT 'IFRS_EU',
  statement TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  ordering INT NOT NULL,
  parent_id UUID REFERENCES public.fs_lines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coa_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
  fs_line_id UUID NOT NULL REFERENCES public.fs_lines(id) ON DELETE CASCADE,
  basis TEXT NOT NULL DEFAULT 'IFRS_EU',
  effective_from DATE,
  effective_to DATE
);

CREATE TABLE IF NOT EXISTS public.je_control_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  period_id UUID REFERENCES public.close_periods(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.journal_batches(id) ON DELETE CASCADE,
  rule public.je_control_rule NOT NULL,
  severity public.je_control_severity NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.variance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  scope TEXT NOT NULL,
  target_code TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'BOTH',
  threshold_abs NUMERIC(18,2),
  threshold_pct NUMERIC(10,2),
  compare_to TEXT NOT NULL DEFAULT 'PRIOR_PERIOD',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.variance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.engagements(id) ON DELETE SET NULL,
  period_id UUID REFERENCES public.close_periods(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.variance_rules(id) ON DELETE CASCADE,
  target_code TEXT NOT NULL,
  value NUMERIC(18,2) NOT NULL,
  baseline NUMERIC(18,2) NOT NULL,
  delta_abs NUMERIC(18,2) NOT NULL,
  delta_pct NUMERIC(10,2) NOT NULL,
  explanation TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ledger_accounts_touch BEFORE UPDATE ON public.ledger_accounts FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_journal_batches_touch BEFORE UPDATE ON public.journal_batches FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_close_periods_touch BEFORE UPDATE ON public.close_periods FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_close_pbc_items_touch BEFORE UPDATE ON public.close_pbc_items FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_reconciliations_touch BEFORE UPDATE ON public.reconciliations FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_je_control_alerts_touch BEFORE UPDATE ON public.je_control_alerts FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_variance_rules_touch BEFORE UPDATE ON public.variance_rules FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
CREATE TRIGGER trg_variance_results_touch BEFORE UPDATE ON public.variance_results FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

COMMIT;

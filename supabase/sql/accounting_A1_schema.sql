-- Accounting Close & GL Foundation schema (Job A-1)
-- Defines core ledgers, close lifecycle, reconciliations, FS mapping, and analytics tables.

-- Enumerated types
CREATE TYPE IF NOT EXISTS public.ledger_account_type AS ENUM ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE');
CREATE TYPE IF NOT EXISTS public.ledger_entry_source AS ENUM ('SUBLEDGER','IMPORT','JOURNAL','ADJUSTMENT');
CREATE TYPE IF NOT EXISTS public.journal_batch_status AS ENUM ('DRAFT','SUBMITTED','APPROVED','POSTED','REJECTED');
CREATE TYPE IF NOT EXISTS public.close_period_status AS ENUM ('OPEN','SUBSTANTIVE_REVIEW','READY_TO_LOCK','LOCKED');
CREATE TYPE IF NOT EXISTS public.close_pbc_area AS ENUM ('BANK','AR','AP','GRNI','PAYROLL','VAT','FIXED_ASSETS','OTHER');
CREATE TYPE IF NOT EXISTS public.close_pbc_status AS ENUM ('REQUESTED','RECEIVED','APPROVED','REJECTED','OBSOLETE');
CREATE TYPE IF NOT EXISTS public.reconciliation_type AS ENUM ('BANK','AR','AP','GRNI','PAYROLL','OTHER');
CREATE TYPE IF NOT EXISTS public.reconciliation_status AS ENUM ('DRAFT','IN_PROGRESS','REVIEW','CLOSED');
CREATE TYPE IF NOT EXISTS public.reconciliation_item_category AS ENUM ('DIT','OC','UNAPPLIED_RECEIPT','UNAPPLIED_PAYMENT','TIMING','ERROR','OTHER');
CREATE TYPE IF NOT EXISTS public.fs_basis AS ENUM ('IFRS_EU','GAPSME');
CREATE TYPE IF NOT EXISTS public.fs_statement AS ENUM ('BS','PL','OCI','EQUITY','CASHFLOWS');
CREATE TYPE IF NOT EXISTS public.je_control_rule AS ENUM ('LATE_POSTING','WEEKEND_USER','ROUND_AMOUNT','MANUAL_TO_SENSITIVE','MISSING_ATTACHMENT');
CREATE TYPE IF NOT EXISTS public.je_control_severity AS ENUM ('LOW','MEDIUM','HIGH');
CREATE TYPE IF NOT EXISTS public.variance_scope AS ENUM ('ACCOUNT','FS_LINE');
CREATE TYPE IF NOT EXISTS public.variance_basis AS ENUM ('ABS','PCT','BOTH');
CREATE TYPE IF NOT EXISTS public.variance_compare_to AS ENUM ('PRIOR_PERIOD','PRIOR_YEAR','BUDGET');
CREATE TYPE IF NOT EXISTS public.variance_status AS ENUM ('OPEN','EXPLAINED','APPROVED');

-- Ledger master data
CREATE TABLE public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS ledger_accounts_org_idx ON public.ledger_accounts (org_id, entity_id, code);

CREATE TABLE public.close_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.close_period_status NOT NULL DEFAULT 'OPEN',
  locked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, entity_id, name)
);

CREATE INDEX IF NOT EXISTS close_periods_org_idx ON public.close_periods (org_id, entity_id, status);

CREATE TABLE public.journal_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.close_periods(id) ON DELETE SET NULL,
  ref TEXT,
  prepared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.journal_batch_status NOT NULL DEFAULT 'DRAFT',
  submitted_at TIMESTAMPTZ,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  note TEXT,
  attachment_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_batches_org_status_idx ON public.journal_batches (org_id, entity_id, status);

CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.close_periods(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
  description TEXT,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  fx_rate NUMERIC(18,8),
  source public.ledger_entry_source NOT NULL DEFAULT 'JOURNAL',
  batch_id UUID REFERENCES public.journal_batches(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ledger_entries_org_period_idx ON public.ledger_entries (org_id, entity_id, period_id, date);
CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON public.ledger_entries (account_id);

CREATE TABLE public.trial_balance_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_debits NUMERIC(18,2) NOT NULL,
  total_credits NUMERIC(18,2) NOT NULL,
  by_account JSONB NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tb_snapshot_unique ON public.trial_balance_snapshots (period_id, locked) WHERE locked = true;

-- PBC and reconciliations
CREATE TABLE public.close_pbc_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  area public.close_pbc_area NOT NULL,
  title TEXT NOT NULL,
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  status public.close_pbc_status NOT NULL DEFAULT 'REQUESTED',
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS close_pbc_items_org_idx ON public.close_pbc_items (org_id, entity_id, period_id, area);

CREATE TABLE public.reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  type public.reconciliation_type NOT NULL,
  control_account_id UUID REFERENCES public.ledger_accounts(id) ON DELETE SET NULL,
  gl_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  external_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  difference NUMERIC(18,2) NOT NULL DEFAULT 0,
  status public.reconciliation_status NOT NULL DEFAULT 'DRAFT',
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  schedule_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reconciliations_org_idx ON public.reconciliations (org_id, entity_id, period_id, type);

CREATE TABLE public.reconciliation_items (
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

CREATE INDEX IF NOT EXISTS reconciliation_items_rec_idx ON public.reconciliation_items (reconciliation_id, category);

-- Financial statement mapping
CREATE TABLE public.fs_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  basis public.fs_basis NOT NULL DEFAULT 'IFRS_EU',
  statement public.fs_statement NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES public.fs_lines(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS fs_lines_unique ON public.fs_lines (org_id, basis, statement, code);

CREATE TABLE public.coa_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE CASCADE,
  fs_line_id UUID NOT NULL REFERENCES public.fs_lines(id) ON DELETE CASCADE,
  basis public.fs_basis NOT NULL DEFAULT 'IFRS_EU',
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, entity_id, account_id, basis)
);

CREATE INDEX IF NOT EXISTS coa_map_fs_idx ON public.coa_map (fs_line_id, basis);

-- Analytics & controls
CREATE TABLE public.je_control_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID REFERENCES public.close_periods(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.journal_batches(id) ON DELETE CASCADE,
  rule public.je_control_rule NOT NULL,
  severity public.je_control_severity NOT NULL,
  hit BOOLEAN NOT NULL DEFAULT true,
  details JSONB NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS je_control_alerts_batch_idx ON public.je_control_alerts (batch_id, resolved);

CREATE TABLE public.variance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  scope public.variance_scope NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  basis public.variance_basis NOT NULL,
  threshold_abs NUMERIC(18,2),
  threshold_pct NUMERIC(10,2),
  compare_to public.variance_compare_to NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, entity_id, scope, code)
);

CREATE INDEX IF NOT EXISTS variance_rules_org_idx ON public.variance_rules (org_id, entity_id, active);

CREATE TABLE public.variance_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.close_periods(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.variance_rules(id) ON DELETE CASCADE,
  target_code TEXT NOT NULL,
  value NUMERIC(18,2) NOT NULL,
  baseline NUMERIC(18,2) NOT NULL,
  delta_abs NUMERIC(18,2) NOT NULL,
  delta_pct NUMERIC(10,2) NOT NULL,
  explanation TEXT,
  status public.variance_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, period_id, target_code)
);

CREATE INDEX IF NOT EXISTS variance_results_org_idx ON public.variance_results (org_id, entity_id, period_id, status);

-- Triggers for updated_at maintenance
CREATE TRIGGER ledger_accounts_updated_at BEFORE UPDATE ON public.ledger_accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER close_periods_updated_at BEFORE UPDATE ON public.close_periods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER journal_batches_updated_at BEFORE UPDATE ON public.journal_batches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER close_pbc_items_updated_at BEFORE UPDATE ON public.close_pbc_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER reconciliations_updated_at BEFORE UPDATE ON public.reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER reconciliation_items_updated_at BEFORE UPDATE ON public.reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER coa_map_updated_at BEFORE UPDATE ON public.coa_map
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER je_control_alerts_updated_at BEFORE UPDATE ON public.je_control_alerts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER variance_rules_updated_at BEFORE UPDATE ON public.variance_rules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER variance_results_updated_at BEFORE UPDATE ON public.variance_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Agent sessions store interactions with AI agents and embeddings
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  prompt TEXT,
  response TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_sessions_org_created_at_idx
  ON public.agent_sessions (org_id, created_at);
CREATE INDEX IF NOT EXISTS agent_sessions_embedding_idx
  ON public.agent_sessions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Audit log for tracking changes and actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_org_created_at_idx
  ON public.audit_logs (org_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_search_idx
  ON public.audit_logs USING gin (
    to_tsvector('english', coalesce(action, '') || ' ' || coalesce(details, ''))
  );

-- Accounting transactions
CREATE TABLE IF NOT EXISTS public.accounting_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accounting_transactions_org_created_at_idx
  ON public.accounting_transactions (org_id, created_at);
CREATE INDEX IF NOT EXISTS accounting_transactions_search_idx
  ON public.accounting_transactions USING gin (
    to_tsvector('english', coalesce(description, ''))
  );

-- Tax filings referencing VAT rules
CREATE TABLE IF NOT EXISTS public.tax_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vat_rule_id UUID REFERENCES public.vat_rules(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount_due NUMERIC(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tax_filings_org_created_at_idx
  ON public.tax_filings (org_id, created_at);
CREATE INDEX IF NOT EXISTS tax_filings_search_idx
  ON public.tax_filings USING gin (
    to_tsvector('english', coalesce(notes, ''))
  );

-- VAT rules seed table
CREATE TABLE IF NOT EXISTS public.vat_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  rate NUMERIC(5,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vat_rules_created_at_idx
  ON public.vat_rules (created_at);

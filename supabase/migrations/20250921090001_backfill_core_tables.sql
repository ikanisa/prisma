-- Ensure core operational tables exist even when earlier migrations were skipped in production.

-- Agent sessions table with RLS and trigger
CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  input TEXT,
  output TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_sessions_read" ON public.agent_sessions;
CREATE POLICY "agent_sessions_read" ON public.agent_sessions
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "agent_sessions_write" ON public.agent_sessions;
CREATE POLICY "agent_sessions_write" ON public.agent_sessions
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
DROP TRIGGER IF EXISTS set_agent_sessions_updated_at ON public.agent_sessions;
CREATE TRIGGER set_agent_sessions_updated_at
  BEFORE UPDATE ON public.agent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- Audit log table with policies
CREATE TABLE IF NOT EXISTS public.audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_read" ON public.audit;
CREATE POLICY "audit_read" ON public.audit
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "audit_insert" ON public.audit;
CREATE POLICY "audit_insert" ON public.audit
  FOR INSERT WITH CHECK (public.is_member_of(org_id));
-- Accounting entries table with trigger
CREATE TABLE IF NOT EXISTS public.accounting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.accounting ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "accounting_read" ON public.accounting;
CREATE POLICY "accounting_read" ON public.accounting
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "accounting_write" ON public.accounting;
CREATE POLICY "accounting_write" ON public.accounting
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
DROP TRIGGER IF EXISTS set_accounting_updated_at ON public.accounting;
CREATE TRIGGER set_accounting_updated_at
  BEFORE UPDATE ON public.accounting
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- Tax rules table with policies
CREATE TABLE IF NOT EXISTS public.tax (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,
  rule TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  reverse_charge BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.tax ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tax_read" ON public.tax;
CREATE POLICY "tax_read" ON public.tax
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));
DROP POLICY IF EXISTS "tax_write" ON public.tax;
CREATE POLICY "tax_write" ON public.tax
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
-- Ensure indexes exist now that tables are in place
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_sessions' AND column_name = 'embedding') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS agent_sessions_embedding_hnsw ON public.agent_sessions USING hnsw (embedding)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agent_sessions' AND column_name = 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS agent_sessions_org_created_at_idx ON public.agent_sessions (org_id, created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit' AND column_name = 'old_data') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_old_data_gin ON public.audit USING gin (old_data)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit' AND column_name = 'new_data') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_new_data_gin ON public.audit USING gin (new_data)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit' AND column_name = 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_org_created_at_idx ON public.audit (org_id, created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting' AND column_name = 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS accounting_org_created_at_idx ON public.accounting (org_id, created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tax' AND column_name = 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS tax_org_created_at_idx ON public.tax (org_id, created_at)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'metadata') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS activity_log_metadata_gin ON public.activity_log USING gin (metadata)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS activity_log_org_created_at_idx ON public.activity_log (org_id, created_at)';
  END IF;
END $$;
-- Seed VAT defaults when the table is present
INSERT INTO public.tax (org_id, jurisdiction, rule, rate, reverse_charge)
VALUES
  (NULL, 'MT', 'standard', 0.18, false),
  (NULL, 'EU', 'b2b_reverse_charge', 0.00, true)
ON CONFLICT DO NOTHING;

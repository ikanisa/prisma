-- Blueprint for core tables with RLS policies

-- Agent sessions table
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
CREATE POLICY "agent_sessions_read" ON public.agent_sessions
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "agent_sessions_write" ON public.agent_sessions
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_agent_sessions_updated_at
  BEFORE UPDATE ON public.agent_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Audit log table
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
CREATE POLICY "audit_read" ON public.audit
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "audit_insert" ON public.audit
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

-- Accounting entries table
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
CREATE POLICY "accounting_read" ON public.accounting
  FOR SELECT USING (public.is_member_of(org_id));
CREATE POLICY "accounting_write" ON public.accounting
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));
CREATE TRIGGER set_accounting_updated_at
  BEFORE UPDATE ON public.accounting
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tax rules table
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
CREATE POLICY "tax_read" ON public.tax
  FOR SELECT USING (org_id IS NULL OR public.is_member_of(org_id));
CREATE POLICY "tax_write" ON public.tax
  FOR ALL USING (public.has_min_role(org_id, 'MANAGER'));

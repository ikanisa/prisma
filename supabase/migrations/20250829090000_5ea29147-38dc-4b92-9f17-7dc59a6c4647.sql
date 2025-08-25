-- Create transactions table for normalized connector data
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT,
  description TEXT,
  transaction_date TIMESTAMPTZ,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_read" ON public.transactions
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

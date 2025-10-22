ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS is_audit_client BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_eqr BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS non_audit_services JSONB,
  ADD COLUMN IF NOT EXISTS independence_checked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS independence_conclusion TEXT DEFAULT 'OK',
  ADD COLUMN IF NOT EXISTS independence_conclusion_note TEXT;

CREATE INDEX IF NOT EXISTS engagements_independence_status_idx
  ON public.engagements (org_id, independence_conclusion);

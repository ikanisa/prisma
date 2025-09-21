-- Indexes to improve multi-tenant queries

CREATE INDEX IF NOT EXISTS documents_org_created_at_idx
  ON public.documents (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS documents_org_name_idx
  ON public.documents (org_id, name);

CREATE INDEX IF NOT EXISTS notifications_org_created_at_idx
  ON public.notifications (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_org_created_at_idx
  ON public.activity_log (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tasks_org_status_created_idx
  ON public.tasks (org_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS clients_org_created_at_idx
  ON public.clients (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS engagements_org_created_at_idx
  ON public.engagements (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS memberships_user_org_idx
  ON public.memberships (user_id, org_id);

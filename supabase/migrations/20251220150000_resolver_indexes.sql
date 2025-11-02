-- Indexes supporting batched resolver patterns introduced for the RAG service
CREATE INDEX IF NOT EXISTS idx_documents_org_created_at ON public.documents (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships (org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_assigned_to ON public.tasks (org_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications (user_id, created_at DESC);

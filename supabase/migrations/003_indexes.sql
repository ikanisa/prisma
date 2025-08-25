-- Performance indexes

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS audit_old_data_gin ON public.audit USING gin (old_data);
CREATE INDEX IF NOT EXISTS audit_new_data_gin ON public.audit USING gin (new_data);
CREATE INDEX IF NOT EXISTS activity_log_metadata_gin ON public.activity_log USING gin (metadata);

-- Vector index for agent session embeddings
CREATE INDEX IF NOT EXISTS agent_sessions_embedding_hnsw ON public.agent_sessions USING hnsw (embedding);

-- Composite indexes on org_id and created_at
CREATE INDEX IF NOT EXISTS agent_sessions_org_created_at_idx ON public.agent_sessions (org_id, created_at);
CREATE INDEX IF NOT EXISTS audit_org_created_at_idx ON public.audit (org_id, created_at);
CREATE INDEX IF NOT EXISTS accounting_org_created_at_idx ON public.accounting (org_id, created_at);
CREATE INDEX IF NOT EXISTS tax_org_created_at_idx ON public.tax (org_id, created_at);
CREATE INDEX IF NOT EXISTS activity_log_org_created_at_idx ON public.activity_log (org_id, created_at);

-- Performance indexes guarded to avoid errors when base tables are missing.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'audit'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_old_data_gin ON public.audit USING gin (old_data)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_new_data_gin ON public.audit USING gin (new_data)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS audit_org_created_at_idx ON public.audit (org_id, created_at)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'activity_log'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS activity_log_metadata_gin ON public.activity_log USING gin (metadata)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS activity_log_org_created_at_idx ON public.activity_log (org_id, created_at)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'agent_sessions'
  ) THEN
    -- Specify operator class for pgvector hnsw
    EXECUTE 'CREATE INDEX IF NOT EXISTS agent_sessions_embedding_hnsw ON public.agent_sessions USING hnsw (embedding vector_l2_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS agent_sessions_org_created_at_idx ON public.agent_sessions (org_id, created_at)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'accounting'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS accounting_org_created_at_idx ON public.accounting (org_id, created_at)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'tax'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS tax_org_created_at_idx ON public.tax (org_id, created_at)';
  END IF;
END $$;

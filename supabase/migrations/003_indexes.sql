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
    -- Check if embedding column exists before creating index
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'agent_sessions' AND column_name = 'embedding'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS agent_sessions_embedding_hnsw ON public.agent_sessions USING hnsw (embedding vector_l2_ops)';
    END IF;
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

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'engagements'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS engagements_independence_conclusion_idx ON public.engagements (org_id, independence_conclusion)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS engagements_client_idx ON public.engagements (client_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'approval_queue'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS approval_queue_org_status_idx ON public.approval_queue (org_id, status, requested_at DESC)';
  END IF;
END $$;

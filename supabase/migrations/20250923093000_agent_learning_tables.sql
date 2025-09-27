-- Agent learning schema extensions: personas, corpora, sources, runs, events, feedback.

-- Table: agent_profiles
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('AUDIT','FINANCE','TAX')),
  certifications JSONB DEFAULT '[]'::jsonb,
  jurisdictions TEXT[] DEFAULT '{}',
  reading_lists JSONB DEFAULT '[]'::jsonb,
  style JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
-- Table: knowledge_corpora
CREATE TABLE IF NOT EXISTS public.knowledge_corpora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('IAS','IFRS','ISA','TAX','ORG')),
  jurisdiction TEXT[] DEFAULT '{}',
  retention TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.knowledge_corpora ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS knowledge_corpora_org_domain_idx
  ON public.knowledge_corpora (org_id, domain);
-- Table: knowledge_sources
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_id UUID NOT NULL REFERENCES public.knowledge_corpora(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_drive','upload','url')),
  source_uri TEXT NOT NULL,
  state JSONB DEFAULT '{}'::jsonb,
  checksum TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS knowledge_sources_corpus_idx
  ON public.knowledge_sources (corpus_id);
-- Table: learning_runs
CREATE TABLE IF NOT EXISTS public.learning_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_kind TEXT NOT NULL CHECK (agent_kind IN ('AUDIT','FINANCE','TAX')),
  mode TEXT NOT NULL CHECK (mode IN ('INITIAL','CONTINUOUS')),
  status TEXT NOT NULL DEFAULT 'pending',
  stats JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);
ALTER TABLE public.learning_runs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS learning_runs_org_mode_idx
  ON public.learning_runs (org_id, mode);
-- Table: knowledge_events
CREATE TABLE IF NOT EXISTS public.knowledge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.learning_runs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('INGEST','CHUNK','EMBED','CURATE','EVAL')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.knowledge_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS knowledge_events_org_created_at_idx
  ON public.knowledge_events (org_id, created_at DESC);
-- Table: agent_feedback
CREATE TABLE IF NOT EXISTS public.agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_kind TEXT NOT NULL CHECK (agent_kind IN ('AUDIT','FINANCE','TAX')),
  session_id UUID REFERENCES public.agent_sessions(id) ON DELETE SET NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  corrective_action JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS agent_feedback_org_created_at_idx
  ON public.agent_feedback (org_id, created_at DESC);
-- Ensure pgvector index exists for chunk embeddings.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'chunks_embedding_hnsw'
  ) THEN
    EXECUTE 'CREATE INDEX chunks_embedding_hnsw ON public.chunks USING hnsw (embedding vector_l2_ops)';
  END IF;
END $$;
-- Row Level Security Policies (org member read; manager write)

DO $$
DECLARE
  policy_stmt TEXT;
BEGIN
  -- Helper to create simple policies
  policy_stmt := 'CREATE POLICY agent_profiles_org_read ON public.agent_profiles
    FOR SELECT USING (public.is_member_of(org_id));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'agent_profiles_org_read'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY agent_profiles_org_write ON public.agent_profiles
    FOR ALL USING (public.has_min_role(org_id, ''MANAGER''));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'agent_profiles_org_write'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY knowledge_corpora_org_read ON public.knowledge_corpora
    FOR SELECT USING (public.is_member_of(org_id));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'knowledge_corpora_org_read'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY knowledge_corpora_org_write ON public.knowledge_corpora
    FOR ALL USING (public.has_min_role(org_id, ''MANAGER''));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'knowledge_corpora_org_write'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY knowledge_sources_org_read ON public.knowledge_sources
    FOR SELECT USING (public.is_member_of((SELECT org_id FROM public.knowledge_corpora kc WHERE kc.id = corpus_id)));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'knowledge_sources_org_read'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY knowledge_sources_org_write ON public.knowledge_sources
    FOR ALL USING (public.has_min_role((SELECT org_id FROM public.knowledge_corpora kc WHERE kc.id = corpus_id), ''MANAGER''));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'knowledge_sources_org_write'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY learning_runs_org_read ON public.learning_runs
    FOR SELECT USING (public.is_member_of(org_id));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'learning_runs_org_read'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY learning_runs_org_write ON public.learning_runs
    FOR ALL USING (public.has_min_role(org_id, ''MANAGER''));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'learning_runs_org_write'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY knowledge_events_org_read ON public.knowledge_events
    FOR SELECT USING (public.is_member_of(org_id));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'knowledge_events_org_read'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY knowledge_events_org_write ON public.knowledge_events
    FOR ALL USING (public.has_min_role(org_id, ''MANAGER''));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'knowledge_events_org_write'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY agent_feedback_org_read ON public.agent_feedback
    FOR SELECT USING (public.is_member_of(org_id));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'agent_feedback_org_read'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;

  policy_stmt := 'CREATE POLICY agent_feedback_org_write ON public.agent_feedback
    FOR ALL USING (public.is_member_of(org_id));';
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'agent_feedback_org_write'
      AND schemaname = 'public'
  ) THEN EXECUTE policy_stmt; END IF;
END $$;

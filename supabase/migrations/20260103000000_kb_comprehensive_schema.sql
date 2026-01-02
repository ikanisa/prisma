-- Knowledge Factory Comprehensive Schema
-- Implements full KB pipeline tables for document ingestion, enrichment, and retrieval

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.kb_document_status AS ENUM (
    'NEW', 'EXTRACTING', 'EXTRACTED', 'ENRICHING', 'ENRICHED', 
    'CHUNKING', 'CHUNKED', 'EMBEDDING', 'READY', 'FAILED', 'OCR_REQUIRED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.kb_confidentiality AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.kb_standard AS ENUM (
    'IFRS', 'ISA', 'GAAP', 'TAX', 'AUDIT_METHODOLOGY', 'COMPANY_LAW', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.kb_doc_type AS ENUM (
    'LAW', 'REGULATION', 'STANDARD', 'GUIDANCE', 'TEMPLATE', 
    'CHECKLIST', 'CASE', 'BOOK', 'MOCK', 'INTERNAL_POLICY', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.kb_run_status AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- KB_SOURCES - Drive folder configurations per tenant
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  drive_folder_id TEXT NOT NULL,
  shared_drive_id TEXT,
  include_subfolders BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  sync_page_token TEXT,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_sources_tenant_folder_idx 
  ON public.kb_sources (tenant_id, drive_folder_id);

ALTER TABLE public.kb_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_sources_tenant_isolation ON public.kb_sources;
CREATE POLICY kb_sources_tenant_isolation ON public.kb_sources
  FOR ALL USING (
    public.is_member_of(kb_sources.tenant_id)
    AND public.has_min_role(kb_sources.tenant_id, 'MANAGER'::public.role_level)
  )
  WITH CHECK (
    public.is_member_of(kb_sources.tenant_id)
    AND public.has_min_role(kb_sources.tenant_id, 'MANAGER'::public.role_level)
  );

-- ============================================================================
-- KB_DOCUMENTS - Document metadata with status, classification, confidentiality
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.kb_sources(id) ON DELETE CASCADE,
  
  -- Drive metadata
  drive_file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  drive_modified_time TIMESTAMPTZ,
  sha256 TEXT,
  etag TEXT,
  size_bytes BIGINT,
  folder_path TEXT,
  
  -- Classification (populated by enricher)
  standard public.kb_standard DEFAULT 'OTHER',
  jurisdiction TEXT,
  effective_date DATE,
  doc_type public.kb_doc_type DEFAULT 'OTHER',
  confidentiality public.kb_confidentiality DEFAULT 'INTERNAL',
  
  -- Processing status
  status public.kb_document_status DEFAULT 'NEW',
  error_message TEXT,
  retry_count INT DEFAULT 0,
  last_processed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_tenant_file_idx 
  ON public.kb_documents (tenant_id, drive_file_id);

CREATE INDEX IF NOT EXISTS kb_documents_status_idx 
  ON public.kb_documents (status) WHERE status != 'READY';

CREATE INDEX IF NOT EXISTS kb_documents_tenant_standard_idx 
  ON public.kb_documents (tenant_id, standard);

CREATE INDEX IF NOT EXISTS kb_documents_confidentiality_idx 
  ON public.kb_documents (tenant_id, confidentiality);

ALTER TABLE public.kb_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_documents_tenant_isolation ON public.kb_documents;
CREATE POLICY kb_documents_tenant_isolation ON public.kb_documents
  FOR ALL USING (
    public.is_member_of(kb_documents.tenant_id)
  )
  WITH CHECK (
    public.is_member_of(kb_documents.tenant_id)
    AND public.has_min_role(kb_documents.tenant_id, 'EMPLOYEE'::public.role_level)
  );

-- ============================================================================
-- KB_DOCUMENT_TEXT - Extracted text with page mapping
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_document_text (
  document_id UUID PRIMARY KEY REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  extracted_text TEXT,
  page_map_json JSONB,  -- [{page: 1, start_char: 0, end_char: 5000}, ...]
  extraction_json JSONB, -- Full extraction metadata
  
  char_count INT,
  token_count INT,
  
  extractor_name TEXT,
  extractor_version TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_document_text ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_document_text_tenant_isolation ON public.kb_document_text;
CREATE POLICY kb_document_text_tenant_isolation ON public.kb_document_text
  FOR ALL USING (
    public.is_member_of(kb_document_text.tenant_id)
  )
  WITH CHECK (
    public.is_member_of(kb_document_text.tenant_id)
  );

-- ============================================================================
-- KB_SUMMARIES - Gemini-generated summaries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  summary_short TEXT,  -- 1-2 sentences
  summary_long TEXT,   -- 1-2 paragraphs
  key_points JSONB,    -- ["point 1", "point 2", ...]
  
  model TEXT NOT NULL,
  prompt_version TEXT,
  confidence REAL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_summaries_document_idx 
  ON public.kb_summaries (document_id);

ALTER TABLE public.kb_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_summaries_tenant_isolation ON public.kb_summaries;
CREATE POLICY kb_summaries_tenant_isolation ON public.kb_summaries
  FOR ALL USING (
    public.is_member_of(kb_summaries.tenant_id)
  )
  WITH CHECK (
    public.is_member_of(kb_summaries.tenant_id)
  );

-- ============================================================================
-- KB_TAGS - Topics and entities extraction
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  topics JSONB,     -- ["VAT", "Revenue Recognition", "Leases"]
  entities JSONB,   -- ["IFRS 15", "IAS 12", "Section 123 of Tax Act"]
  
  model TEXT NOT NULL,
  prompt_version TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_tags_document_idx 
  ON public.kb_tags (document_id);

ALTER TABLE public.kb_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_tags_tenant_isolation ON public.kb_tags;
CREATE POLICY kb_tags_tenant_isolation ON public.kb_tags
  FOR ALL USING (
    public.is_member_of(kb_tags.tenant_id)
  )
  WITH CHECK (
    public.is_member_of(kb_tags.tenant_id)
  );

-- ============================================================================
-- KB_CHUNKS - Text chunks with page ranges and heading paths
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kb_documents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  chunk_index INT NOT NULL,
  heading_path TEXT,  -- "IFRS 15 > Step 3 > Allocation"
  page_start INT,
  page_end INT,
  
  content TEXT NOT NULL,
  token_count INT NOT NULL,
  content_hash TEXT NOT NULL,  -- SHA256 of content for idempotency
  
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_chunks_document_hash_idx 
  ON public.kb_chunks (document_id, content_hash);

CREATE INDEX IF NOT EXISTS kb_chunks_document_idx 
  ON public.kb_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS kb_chunks_tenant_idx 
  ON public.kb_chunks (tenant_id);

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_chunks_tenant_isolation ON public.kb_chunks;
CREATE POLICY kb_chunks_tenant_isolation ON public.kb_chunks
  FOR ALL USING (
    public.is_member_of(kb_chunks.tenant_id)
  )
  WITH CHECK (
    public.is_member_of(kb_chunks.tenant_id)
  );

-- ============================================================================
-- KB_EMBEDDINGS - Vector embeddings for chunks (pgvector)
-- ============================================================================

-- Ensure pgvector is enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.kb_embeddings (
  chunk_id UUID PRIMARY KEY REFERENCES public.kb_chunks(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  dims INT NOT NULL DEFAULT 1536,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS kb_embeddings_vector_idx 
  ON public.kb_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS kb_embeddings_tenant_idx 
  ON public.kb_embeddings (tenant_id);

ALTER TABLE public.kb_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_embeddings_tenant_isolation ON public.kb_embeddings;
CREATE POLICY kb_embeddings_tenant_isolation ON public.kb_embeddings
  FOR ALL USING (
    public.is_member_of(kb_embeddings.tenant_id)
  )
  WITH CHECK (
    public.is_member_of(kb_embeddings.tenant_id)
  );

-- ============================================================================
-- KB_RUNS - Pipeline run tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.kb_sources(id) ON DELETE SET NULL,
  
  status public.kb_run_status DEFAULT 'QUEUED',
  run_type TEXT NOT NULL DEFAULT 'sync',  -- 'sync', 'backfill', 'reindex', 'reprocess'
  
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  stats JSONB DEFAULT '{}'::jsonb,  -- {processed: 10, failed: 1, skipped: 5}
  error_message TEXT,
  
  initiated_by UUID,  -- user who triggered
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_runs_tenant_idx 
  ON public.kb_runs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS kb_runs_status_idx 
  ON public.kb_runs (status) WHERE status IN ('QUEUED', 'RUNNING');

ALTER TABLE public.kb_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_runs_tenant_isolation ON public.kb_runs;
CREATE POLICY kb_runs_tenant_isolation ON public.kb_runs
  FOR ALL USING (
    public.is_member_of(kb_runs.tenant_id)
  )
  WITH CHECK (
    public.is_member_of(kb_runs.tenant_id)
    AND public.has_min_role(kb_runs.tenant_id, 'MANAGER'::public.role_level)
  );

-- ============================================================================
-- KB_AUDIT_TRAIL - RAG query logging for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.kb_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  
  query TEXT NOT NULL,
  query_embedding_model TEXT,
  
  retrieved_chunk_ids JSONB,  -- ["uuid1", "uuid2", ...]
  retrieved_document_ids JSONB,
  retrieval_scores JSONB,
  
  filters_applied JSONB,  -- {standard: "IFRS", jurisdiction: "Malta"}
  
  response_id UUID,  -- Link to agent response if applicable
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_audit_trail_tenant_idx 
  ON public.kb_audit_trail (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS kb_audit_trail_user_idx 
  ON public.kb_audit_trail (user_id, created_at DESC) WHERE user_id IS NOT NULL;

ALTER TABLE public.kb_audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_audit_trail_tenant_isolation ON public.kb_audit_trail;
CREATE POLICY kb_audit_trail_tenant_isolation ON public.kb_audit_trail
  FOR ALL USING (
    public.is_member_of(kb_audit_trail.tenant_id)
    AND public.has_min_role(kb_audit_trail.tenant_id, 'MANAGER'::public.role_level)
  )
  WITH CHECK (
    public.is_member_of(kb_audit_trail.tenant_id)
  );

-- ============================================================================
-- HELPER FUNCTION: Check confidentiality access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kb_can_access_confidentiality(
  p_tenant_id UUID,
  p_confidentiality public.kb_confidentiality
) RETURNS BOOLEAN AS $$
BEGIN
  -- PUBLIC: all authenticated users
  IF p_confidentiality = 'PUBLIC' THEN
    RETURN true;
  END IF;
  
  -- INTERNAL: EMPLOYEE or above
  IF p_confidentiality = 'INTERNAL' THEN
    RETURN public.has_min_role(p_tenant_id, 'EMPLOYEE'::public.role_level);
  END IF;
  
  -- RESTRICTED: MANAGER or above
  IF p_confidentiality = 'RESTRICTED' THEN
    RETURN public.has_min_role(p_tenant_id, 'MANAGER'::public.role_level);
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- HELPER FUNCTION: Vector search with filters
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kb_search(
  p_tenant_id UUID,
  p_query_embedding vector(1536),
  p_limit INT DEFAULT 10,
  p_standard public.kb_standard DEFAULT NULL,
  p_jurisdiction TEXT DEFAULT NULL,
  p_doc_type public.kb_doc_type DEFAULT NULL,
  p_min_score REAL DEFAULT 0.5
) RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_name TEXT,
  chunk_content TEXT,
  heading_path TEXT,
  page_start INT,
  page_end INT,
  score REAL,
  standard public.kb_standard,
  jurisdiction TEXT,
  confidentiality public.kb_confidentiality
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS chunk_id,
    d.id AS document_id,
    d.name AS document_name,
    c.content AS chunk_content,
    c.heading_path,
    c.page_start,
    c.page_end,
    (1 - (e.embedding <=> p_query_embedding))::REAL AS score,
    d.standard,
    d.jurisdiction,
    d.confidentiality
  FROM public.kb_embeddings e
  JOIN public.kb_chunks c ON c.id = e.chunk_id
  JOIN public.kb_documents d ON d.id = c.document_id
  WHERE e.tenant_id = p_tenant_id
    AND d.status = 'READY'
    AND public.kb_can_access_confidentiality(p_tenant_id, d.confidentiality)
    AND (p_standard IS NULL OR d.standard = p_standard)
    AND (p_jurisdiction IS NULL OR d.jurisdiction = p_jurisdiction)
    AND (p_doc_type IS NULL OR d.doc_type = p_doc_type)
    AND (1 - (e.embedding <=> p_query_embedding)) >= p_min_score
  ORDER BY e.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables exist
DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  SELECT array_agg(t.table_name) INTO missing_tables
  FROM (VALUES 
    ('kb_sources'), ('kb_documents'), ('kb_document_text'),
    ('kb_summaries'), ('kb_tags'), ('kb_chunks'),
    ('kb_embeddings'), ('kb_runs'), ('kb_audit_trail')
  ) AS t(table_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
  );
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Missing KB tables: %', array_to_string(missing_tables, ', ');
  END IF;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
  tables_without_rls TEXT[];
BEGIN
  SELECT array_agg(tablename) INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public' 
    AND tablename LIKE 'kb_%'
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' 
        AND c.relname = tablename
        AND c.relrowsecurity = true
    );
  
  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE WARNING 'KB tables without RLS: %', array_to_string(tables_without_rls, ', ');
  END IF;
END $$;

-- ============================================
-- PHASE 3: RENAME TABLES & CONSOLIDATE FUNCTIONS
-- Migration: Database Consolidation - Standardization
-- ============================================
-- This migration renames tables for consistency and consolidates functions.
-- Run AFTER Phase 2 (data merge) and Phase 1 (delete).

-- ============================================
-- SECTION 1: RENAME KB TABLES FOR CONSISTENCY
-- ============================================

-- Rename kb_documents to knowledge_documents if kb_documents exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kb_documents' AND table_schema = 'public') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_documents' AND table_schema = 'public') THEN
        ALTER TABLE public.kb_documents RENAME TO knowledge_documents;
    END IF;
END $$;

-- Rename kb_chunks to knowledge_chunks if kb_chunks exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kb_chunks' AND table_schema = 'public') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_chunks' AND table_schema = 'public') THEN
        ALTER TABLE public.kb_chunks RENAME TO knowledge_chunks;
    END IF;
END $$;

-- Rename kb_embeddings to knowledge_embeddings if it exists and wasn't merged
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kb_embeddings' AND table_schema = 'public') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_embeddings' AND table_schema = 'public') THEN
        ALTER TABLE public.kb_embeddings RENAME TO knowledge_embeddings;
    END IF;
END $$;

-- ============================================
-- SECTION 2: STANDARDIZE COLUMN NAMING
-- ============================================

-- Ensure org_id consistency (some tables use organization_id, some use org_id)
-- We standardize to organization_id for clarity

DO $$
BEGIN
    -- agent_reasoning_traces: rename org_id to organization_id if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agent_reasoning_traces' 
        AND column_name = 'org_id'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agent_reasoning_traces' 
            AND column_name = 'organization_id'
        )
    ) THEN
        ALTER TABLE public.agent_reasoning_traces RENAME COLUMN org_id TO organization_id;
    END IF;
END $$;

-- ============================================
-- SECTION 3: CONSOLIDATE DUPLICATE FUNCTIONS
-- ============================================

-- Drop duplicate updated_at trigger functions, keep one canonical version
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.touch_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_kb_documents_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_ckb_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_knowledge_source_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_knowledge_sources_updated_at() CASCADE;

-- Create single canonical updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure app schema also has consistent function
CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = app, public;

-- ============================================
-- SECTION 4: CONSOLIDATE SEARCH FUNCTIONS
-- ============================================

-- Drop duplicate search functions
DROP FUNCTION IF EXISTS public.kb_search(text, integer, float) CASCADE;
DROP FUNCTION IF EXISTS public.match_kb_documents(vector, float, integer, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.hybrid_search_chunks(text, vector, integer, float) CASCADE;
DROP FUNCTION IF EXISTS public.semantic_search_chunks(vector, integer, float) CASCADE;

-- Keep only the comprehensive search function: search_curated_knowledge
-- (Already defined in curated_knowledge_base migration)

-- Create a simple wrapper for backward compatibility if needed
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
    p_query_embedding vector(1536),
    p_match_threshold float DEFAULT 0.7,
    p_match_count int DEFAULT 10,
    p_filter jsonb DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    content text,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.content,
        1 - (c.embedding_vector <=> p_query_embedding) as similarity
    FROM knowledge_chunks c
    WHERE c.embedding_vector IS NOT NULL
      AND 1 - (c.embedding_vector <=> p_query_embedding) > p_match_threshold
      AND (p_filter IS NULL OR c.metadata @> p_filter)
    ORDER BY c.embedding_vector <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;

-- ============================================
-- SECTION 5: UPDATE TRIGGERS TO USE CANONICAL FUNCTION
-- ============================================

-- Drop and recreate triggers using canonical function

-- Organizations
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Agents
DROP TRIGGER IF EXISTS trg_agents_touch ON public.agents;
CREATE TRIGGER trg_agents_touch
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Agent Personas
DROP TRIGGER IF EXISTS trg_agent_personas_touch ON public.agent_personas;
CREATE TRIGGER trg_agent_personas_touch
    BEFORE UPDATE ON public.agent_personas
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Agent Tools
DROP TRIGGER IF EXISTS trg_agent_tools_touch ON public.agent_tools;
CREATE TRIGGER trg_agent_tools_touch
    BEFORE UPDATE ON public.agent_tools
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Curated Knowledge Base
DROP TRIGGER IF EXISTS trigger_ckb_updated_at ON public.curated_knowledge_base;
CREATE TRIGGER trigger_ckb_updated_at
    BEFORE UPDATE ON public.curated_knowledge_base
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Deep Search Sources
DROP TRIGGER IF EXISTS trigger_deep_search_sources_updated_at ON public.deep_search_sources;
CREATE TRIGGER trigger_deep_search_sources_updated_at
    BEFORE UPDATE ON public.deep_search_sources
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Retrieval Guardrails
DROP TRIGGER IF EXISTS trigger_guardrails_updated_at ON public.retrieval_guardrails;
CREATE TRIGGER trigger_guardrails_updated_at
    BEFORE UPDATE ON public.retrieval_guardrails
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Engagements
DROP TRIGGER IF EXISTS update_engagements_updated_at ON public.engagements;
CREATE TRIGGER update_engagements_updated_at
    BEFORE UPDATE ON public.engagements
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- SECTION 6: ADD INDEXES FOR RENAMED TABLES
-- ============================================

-- Ensure indexes exist on renamed tables
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_org 
    ON public.knowledge_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc 
    ON public.knowledge_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding 
    ON public.knowledge_chunks USING hnsw (embedding_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================
-- SECTION 7: COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON FUNCTION public.handle_updated_at() IS 
    'Canonical trigger function to update updated_at column on row update';

COMMENT ON FUNCTION public.match_knowledge_chunks(vector, float, int, jsonb) IS 
    'Semantic search for knowledge chunks using vector similarity';

-- ============================================
-- VERIFICATION
-- ============================================
-- Run to verify function consolidation:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_schema = 'public' AND routine_name LIKE '%update%';

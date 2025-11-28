-- ============================================
-- AI AGENT KNOWLEDGE MANAGEMENT SYSTEM
-- Phase 6: RAG Integration & Knowledge Management
-- ============================================

-- Knowledge Sources (Enhanced)
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(100) NOT NULL,
    
    -- Source Type & Configuration
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'document', 'database', 'api', 'website', 'manual', 'integration'
    )),
    source_config JSONB NOT NULL DEFAULT '{}',
    
    -- Embedding Configuration
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    chunk_size INTEGER DEFAULT 1000,
    chunk_overlap INTEGER DEFAULT 200,
    chunking_strategy VARCHAR(50) DEFAULT 'recursive' CHECK (chunking_strategy IN (
        'recursive', 'sentence', 'paragraph', 'semantic', 'custom'
    )),
    
    -- Index Configuration
    index_name VARCHAR(100),
    vector_store_id VARCHAR(255), -- For OpenAI Vector Store
    
    -- Sync Settings
    sync_frequency VARCHAR(50) DEFAULT 'manual' CHECK (sync_frequency IN (
        'manual', 'hourly', 'daily', 'weekly', 'realtime'
    )),
    sync_schedule JSONB, -- Cron expression or schedule config
    auto_sync BOOLEAN DEFAULT false,
    
    -- Status & Metrics
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'syncing', 'active', 'failed', 'paused'
    )),
    last_synced_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    
    -- Statistics
    document_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_knowledge_sources_org_status ON knowledge_sources(organization_id, status);
CREATE INDEX idx_knowledge_sources_next_sync ON knowledge_sources(next_sync_at) WHERE auto_sync = true;
CREATE INDEX idx_knowledge_sources_tags ON knowledge_sources USING GIN(tags);

-- Documents (Knowledge Source Items)
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    -- Identity
    name VARCHAR(500) NOT NULL,
    external_id VARCHAR(500), -- ID from external system
    file_path TEXT,
    url TEXT,
    
    -- Content
    content_type VARCHAR(100),
    content_hash VARCHAR(64),
    file_size BIGINT,
    
    -- Processing
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'indexed', 'failed', 'outdated'
    )),
    processing_error TEXT,
    
    -- Metrics
    chunk_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    repo_folder VARCHAR(255), -- For backward compatibility with existing system
    
    -- Timestamps
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(knowledge_source_id, external_id)
);

CREATE INDEX idx_knowledge_documents_source ON knowledge_documents(knowledge_source_id, status);
CREATE INDEX idx_knowledge_documents_org ON knowledge_documents(organization_id);
CREATE INDEX idx_knowledge_documents_hash ON knowledge_documents(content_hash);

-- Chunks (Vector Embeddings) - Enhanced version
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    
    -- Position
    chunk_index INTEGER NOT NULL,
    start_offset INTEGER,
    end_offset INTEGER,
    
    -- Content
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    
    -- Embedding
    embedding vector(1536), -- Dimension for text-embedding-3-small
    embed_model VARCHAR(100) NOT NULL,
    
    -- Index Info
    index_name VARCHAR(100),
    
    -- Metadata for filtering
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(document_id, chunk_index)
);

-- Vector similarity index (HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Additional indexes
CREATE INDEX idx_knowledge_chunks_org_index ON knowledge_chunks(organization_id, index_name);
CREATE INDEX idx_knowledge_chunks_source ON knowledge_chunks(knowledge_source_id);
CREATE INDEX idx_knowledge_chunks_tags ON knowledge_chunks USING GIN(tags);

-- Agent-Knowledge Source Assignments
CREATE TABLE IF NOT EXISTS agent_knowledge_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    
    -- Retrieval Settings
    retrieval_strategy VARCHAR(50) DEFAULT 'similarity' CHECK (retrieval_strategy IN (
        'similarity', 'hybrid', 'keyword', 'mmr', 'custom'
    )),
    top_k INTEGER DEFAULT 5,
    similarity_threshold DECIMAL(3,2) DEFAULT 0.70,
    
    -- Advanced Settings
    rerank_enabled BOOLEAN DEFAULT true,
    rerank_model VARCHAR(100),
    use_metadata_filter BOOLEAN DEFAULT false,
    metadata_filter JSONB,
    
    -- Priority & Status
    priority INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, knowledge_source_id)
);

CREATE INDEX idx_agent_knowledge_agent ON agent_knowledge_assignments(agent_id, is_enabled);
CREATE INDEX idx_agent_knowledge_source ON agent_knowledge_assignments(knowledge_source_id);

-- Knowledge Sync Jobs
CREATE TABLE IF NOT EXISTS knowledge_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    
    -- Job Details
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN (
        'full_sync', 'incremental', 'reindex', 'cleanup'
    )),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    
    -- Progress
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    progress_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Results
    documents_added INTEGER DEFAULT 0,
    documents_updated INTEGER DEFAULT 0,
    documents_deleted INTEGER DEFAULT 0,
    chunks_created INTEGER DEFAULT 0,
    
    -- Error Handling
    error_message TEXT,
    error_details JSONB,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    
    -- Metadata
    triggered_by VARCHAR(50) DEFAULT 'manual' CHECK (triggered_by IN (
        'manual', 'schedule', 'webhook', 'api'
    )),
    triggered_by_user UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_sync_jobs_source ON knowledge_sync_jobs(knowledge_source_id, created_at DESC);
CREATE INDEX idx_knowledge_sync_jobs_status ON knowledge_sync_jobs(status, started_at);

-- Search History & Analytics
CREATE TABLE IF NOT EXISTS knowledge_search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Query Info
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    
    -- Context
    agent_id UUID,
    user_id UUID,
    session_id UUID,
    
    -- Search Config
    knowledge_sources UUID[],
    top_k INTEGER,
    retrieval_strategy VARCHAR(50),
    
    -- Results
    results_count INTEGER,
    results JSONB, -- Serialized result IDs and scores
    
    -- Performance
    latency_ms INTEGER,
    rerank_used BOOLEAN,
    fallback_used BOOLEAN,
    
    -- Feedback
    user_rating INTEGER,
    user_feedback TEXT,
    result_clicked UUID, -- Which result was selected
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_search_org_date ON knowledge_search_analytics(organization_id, created_at DESC);
CREATE INDEX idx_knowledge_search_agent ON knowledge_search_analytics(agent_id);
CREATE INDEX idx_knowledge_search_embedding ON knowledge_search_analytics 
    USING hnsw (query_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Knowledge Source Templates
CREATE TABLE IF NOT EXISTS knowledge_source_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Template
    source_type VARCHAR(50) NOT NULL,
    default_config JSONB NOT NULL,
    schema JSONB, -- JSON Schema for validation
    
    -- Settings
    is_public BOOLEAN DEFAULT false,
    icon VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO knowledge_source_templates (name, description, category, source_type, default_config, icon) VALUES
    ('Google Drive Folder', 'Sync documents from a Google Drive folder', 'cloud_storage', 'integration', 
     '{"type": "google_drive", "folder_id": "", "file_types": ["pdf", "docx", "txt"], "recursive": true}'::jsonb, 'drive'),
    ('Website Scraper', 'Crawl and index a website', 'web', 'website',
     '{"start_url": "", "max_depth": 2, "allowed_domains": [], "excluded_paths": []}'::jsonb, 'globe'),
    ('Supabase Table', 'Index data from a Supabase table', 'database', 'database',
     '{"table_name": "", "content_column": "", "metadata_columns": []}'::jsonb, 'database'),
    ('Manual Upload', 'Upload documents manually', 'upload', 'document',
     '{"allowed_types": ["pdf", "txt", "docx", "md"], "max_size_mb": 10}'::jsonb, 'upload'),
    ('REST API', 'Fetch data from a REST API endpoint', 'api', 'api',
     '{"endpoint": "", "method": "GET", "auth_type": "none", "response_path": ""}'::jsonb, 'api'),
    ('Confluence Space', 'Sync pages from Confluence', 'collaboration', 'integration',
     '{"type": "confluence", "space_key": "", "include_attachments": false}'::jsonb, 'confluence'),
    ('Notion Database', 'Sync pages from a Notion database', 'collaboration', 'integration',
     '{"type": "notion", "database_id": "", "include_properties": true}'::jsonb, 'notion')
ON CONFLICT DO NOTHING;

-- Backward compatibility: Ensure chunks table exists with org_id
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS org_id UUID;
UPDATE chunks SET org_id = (SELECT org_id FROM documents WHERE documents.id = chunks.document_id LIMIT 1) WHERE org_id IS NULL;

-- RLS Policies
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_search_analytics ENABLE ROW LEVEL SECURITY;

-- Update trigger for knowledge_sources
CREATE OR REPLACE FUNCTION update_knowledge_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_sources_updated_at
    BEFORE UPDATE ON knowledge_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_sources_updated_at();

-- Trigger to update knowledge source stats
CREATE OR REPLACE FUNCTION update_knowledge_source_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE knowledge_sources
        SET 
            chunk_count = (SELECT COUNT(*) FROM knowledge_chunks WHERE knowledge_source_id = NEW.knowledge_source_id),
            document_count = (SELECT COUNT(*) FROM knowledge_documents WHERE knowledge_source_id = NEW.knowledge_source_id AND status = 'indexed'),
            updated_at = NOW()
        WHERE id = NEW.knowledge_source_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE knowledge_sources
        SET 
            chunk_count = (SELECT COUNT(*) FROM knowledge_chunks WHERE knowledge_source_id = OLD.knowledge_source_id),
            document_count = (SELECT COUNT(*) FROM knowledge_documents WHERE knowledge_source_id = OLD.knowledge_source_id AND status = 'indexed'),
            updated_at = NOW()
        WHERE id = OLD.knowledge_source_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stats_on_chunk_change
    AFTER INSERT OR UPDATE OR DELETE ON knowledge_chunks
    FOR EACH ROW
    EXECUTE FUNCTION update_knowledge_source_stats();

-- Helper function for semantic search
CREATE OR REPLACE FUNCTION semantic_search_chunks(
    p_org_id UUID,
    p_query_embedding vector(1536),
    p_knowledge_sources UUID[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 5,
    p_similarity_threshold DECIMAL DEFAULT 0.70
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    knowledge_source_id UUID,
    content TEXT,
    similarity_score DECIMAL,
    chunk_index INTEGER,
    metadata JSONB,
    document_name VARCHAR,
    source_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kc.id AS chunk_id,
        kc.document_id,
        kc.knowledge_source_id,
        kc.content,
        ROUND((1 - (kc.embedding <=> p_query_embedding))::numeric, 4) AS similarity_score,
        kc.chunk_index,
        kc.metadata,
        kd.name AS document_name,
        ks.name AS source_name
    FROM knowledge_chunks kc
    JOIN knowledge_documents kd ON kd.id = kc.document_id
    JOIN knowledge_sources ks ON ks.id = kc.knowledge_source_id
    WHERE 
        kc.organization_id = p_org_id
        AND (p_knowledge_sources IS NULL OR kc.knowledge_source_id = ANY(p_knowledge_sources))
        AND (1 - (kc.embedding <=> p_query_embedding)) >= p_similarity_threshold
    ORDER BY kc.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function for hybrid search (semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
    p_org_id UUID,
    p_query_text TEXT,
    p_query_embedding vector(1536),
    p_knowledge_sources UUID[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 5,
    p_semantic_weight DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    knowledge_source_id UUID,
    content TEXT,
    combined_score DECIMAL,
    semantic_score DECIMAL,
    keyword_score DECIMAL,
    chunk_index INTEGER,
    metadata JSONB,
    document_name VARCHAR,
    source_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_results AS (
        SELECT 
            kc.id,
            kc.document_id,
            kc.knowledge_source_id,
            kc.content,
            kc.chunk_index,
            kc.metadata,
            ROUND((1 - (kc.embedding <=> p_query_embedding))::numeric, 4) AS sim_score
        FROM knowledge_chunks kc
        WHERE 
            kc.organization_id = p_org_id
            AND (p_knowledge_sources IS NULL OR kc.knowledge_source_id = ANY(p_knowledge_sources))
        ORDER BY kc.embedding <=> p_query_embedding
        LIMIT p_limit * 2
    ),
    keyword_results AS (
        SELECT 
            kc.id,
            ts_rank_cd(to_tsvector('english', kc.content), plainto_tsquery('english', p_query_text)) AS kw_score
        FROM knowledge_chunks kc
        WHERE 
            kc.organization_id = p_org_id
            AND (p_knowledge_sources IS NULL OR kc.knowledge_source_id = ANY(p_knowledge_sources))
            AND to_tsvector('english', kc.content) @@ plainto_tsquery('english', p_query_text)
    )
    SELECT 
        sr.id AS chunk_id,
        sr.document_id,
        sr.knowledge_source_id,
        sr.content,
        ROUND((
            (COALESCE(sr.sim_score, 0) * p_semantic_weight) + 
            (COALESCE(kr.kw_score, 0) * (1 - p_semantic_weight))
        )::numeric, 4) AS combined_score,
        sr.sim_score AS semantic_score,
        ROUND(COALESCE(kr.kw_score, 0)::numeric, 4) AS keyword_score,
        sr.chunk_index,
        sr.metadata,
        kd.name AS document_name,
        ks.name AS source_name
    FROM semantic_results sr
    LEFT JOIN keyword_results kr ON kr.id = sr.id
    JOIN knowledge_documents kd ON kd.id = sr.document_id
    JOIN knowledge_sources ks ON ks.id = sr.knowledge_source_id
    ORDER BY combined_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE knowledge_sources IS 'Knowledge sources that agents can query via RAG';
COMMENT ON TABLE knowledge_documents IS 'Individual documents within knowledge sources';
COMMENT ON TABLE knowledge_chunks IS 'Text chunks with vector embeddings for semantic search';
COMMENT ON TABLE agent_knowledge_assignments IS 'Assignment of knowledge sources to agents';
COMMENT ON TABLE knowledge_sync_jobs IS 'Background jobs for syncing knowledge sources';
COMMENT ON TABLE knowledge_search_analytics IS 'Analytics for knowledge base searches';

-- Migration: Create knowledge_sources table
-- Description: Stores knowledge base content for RAG (Retrieval Augmented Generation)
-- Author: Prisma Glow Team
-- Date: 2024-11-28

CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Source identification
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) CHECK (source_type IN (
        'document',       -- PDF, Word, etc.
        'webpage',        -- Web scraping
        'manual',         -- Manually entered
        'api',            -- From API
        'database'        -- From database query
    )),
    
    -- Content
    content TEXT NOT NULL,
    content_hash VARCHAR(64),  -- SHA-256 hash for deduplication
    word_count INTEGER,
    
    -- Embeddings for vector search
    embedding vector(1536),  -- OpenAI ada-002 embedding size
    
    -- Source metadata
    source_url TEXT,
    file_path TEXT,
    file_type VARCHAR(50),
    file_size_bytes BIGINT,
    
    -- Processing
    processed_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ,
    
    -- Categorization
    category VARCHAR(100),
    tags TEXT[],
    language VARCHAR(10) DEFAULT 'en',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'outdated')),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, content_hash)
);

CREATE INDEX idx_knowledge_sources_organization ON knowledge_sources(organization_id);
CREATE INDEX idx_knowledge_sources_status ON knowledge_sources(status) WHERE status = 'active';
CREATE INDEX idx_knowledge_sources_category ON knowledge_sources(category);
CREATE INDEX idx_knowledge_sources_tags ON knowledge_sources USING GIN(tags);
CREATE INDEX idx_knowledge_sources_embedding ON knowledge_sources USING ivfflat (embedding vector_cosine_ops);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_sources_select_policy ON knowledge_sources FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY knowledge_sources_modify_policy ON knowledge_sources FOR ALL
    USING (EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND organization_id = knowledge_sources.organization_id AND role IN ('admin', 'owner')));

COMMENT ON TABLE knowledge_sources IS 'Knowledge base content for RAG with vector embeddings';

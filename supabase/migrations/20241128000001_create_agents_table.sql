-- Migration: Create agents table
-- Description: Core table for AI agent configurations and metadata
-- Author: Prisma Glow Team
-- Date: 2024-11-28

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'assistant',      -- General-purpose conversational agent
        'specialist',     -- Domain expert (tax, audit, accounting)
        'orchestrator',   -- Coordinates multiple agents
        'evaluator',      -- Reviews and validates work
        'autonomous'      -- Operates independently with minimal supervision
    )),
    category VARCHAR(100),  -- e.g., 'tax', 'audit', 'accounting', 'corporate-services'
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft',          -- Being configured
        'testing',        -- In testing phase
        'active',         -- Live and available
        'deprecated',     -- Being phased out
        'archived'        -- No longer in use
    )),
    is_public BOOLEAN DEFAULT false,  -- Available to all users in org
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    parent_version_id UUID REFERENCES agents(id) ON DELETE SET NULL,  -- For version history
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    -- Ensure unique slug per organization and version
    UNIQUE(organization_id, slug, version)
);

-- Create indexes for performance
CREATE INDEX idx_agents_organization ON agents(organization_id);
CREATE INDEX idx_agents_status ON agents(status) WHERE status = 'active';
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_category ON agents(category);
CREATE INDEX idx_agents_created_at ON agents(created_at DESC);
CREATE INDEX idx_agents_slug ON agents(organization_id, slug);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agents_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view agents in their organization
CREATE POLICY agents_select_policy ON agents
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert agents if they have admin role
CREATE POLICY agents_insert_policy ON agents
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agents.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Policy: Users can update agents if they have admin role
CREATE POLICY agents_update_policy ON agents
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agents.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Policy: Users can delete agents if they have owner role
CREATE POLICY agents_delete_policy ON agents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agents.organization_id
            AND role = 'owner'
        )
    );

-- Add helpful comments
COMMENT ON TABLE agents IS 'Core table storing AI agent configurations and metadata';
COMMENT ON COLUMN agents.id IS 'Unique identifier for the agent';
COMMENT ON COLUMN agents.organization_id IS 'Organization that owns this agent';
COMMENT ON COLUMN agents.slug IS 'URL-friendly identifier (e.g., "tax-corp-eu-022")';
COMMENT ON COLUMN agents.name IS 'Human-readable name (e.g., "EU Corporate Tax Specialist")';
COMMENT ON COLUMN agents.type IS 'Agent type: assistant, specialist, orchestrator, evaluator, or autonomous';
COMMENT ON COLUMN agents.category IS 'Domain category: tax, audit, accounting, etc.';
COMMENT ON COLUMN agents.status IS 'Current lifecycle status';
COMMENT ON COLUMN agents.version IS 'Semantic version number (e.g., "1.2.3")';
COMMENT ON COLUMN agents.parent_version_id IS 'Reference to previous version for version history';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: agents table created successfully';
    RAISE NOTICE 'Indexes created: 6 indexes for optimal query performance';
    RAISE NOTICE 'RLS enabled: Row-level security policies active';
    RAISE NOTICE 'Ready to store agent configurations';
END $$;

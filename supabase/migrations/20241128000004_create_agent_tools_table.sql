-- Migration: Create agent_tools table
-- Description: Defines available tools/functions that agents can use
-- Author: Prisma Glow Team
-- Date: 2024-11-28

CREATE TABLE IF NOT EXISTS agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Tool identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),  -- e.g., 'search', 'calculation', 'database', 'api'
    
    -- Function definition (OpenAI function calling format)
    function_schema JSONB NOT NULL,  -- OpenAI function schema
    
    -- Implementation
    implementation_type VARCHAR(50) CHECK (implementation_type IN (
        'builtin',        -- Built-in system function
        'api',            -- External API call
        'database',       -- Database query
        'code',           -- Custom code execution
        'plugin'          -- Plugin/extension
    )),
    endpoint_url TEXT,
    http_method VARCHAR(10),
    headers JSONB,
    auth_required BOOLEAN DEFAULT false,
    
    -- Status and lifecycle
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'archived')),
    version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_agent_tools_organization ON agent_tools(organization_id);
CREATE INDEX idx_agent_tools_status ON agent_tools(status) WHERE status = 'active';
CREATE INDEX idx_agent_tools_category ON agent_tools(category);

ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_tools_select_policy ON agent_tools FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

CREATE POLICY agent_tools_modify_policy ON agent_tools FOR ALL
    USING (EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND organization_id = agent_tools.organization_id AND role IN ('admin', 'owner')));

COMMENT ON TABLE agent_tools IS 'Defines tools/functions that agents can invoke';

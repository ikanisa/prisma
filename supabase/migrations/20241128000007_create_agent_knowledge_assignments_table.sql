-- Migration: Create agent_knowledge_assignments table
-- Description: Links agents to their knowledge sources
-- Author: Prisma Glow Team
-- Date: 2024-11-28

CREATE TABLE IF NOT EXISTS agent_knowledge_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    
    -- Configuration
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,  -- Order of knowledge preference
    
    -- Metadata
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, knowledge_source_id)
);

CREATE INDEX idx_agent_knowledge_assignments_agent ON agent_knowledge_assignments(agent_id);
CREATE INDEX idx_agent_knowledge_assignments_knowledge ON agent_knowledge_assignments(knowledge_source_id);
CREATE INDEX idx_agent_knowledge_assignments_enabled ON agent_knowledge_assignments(agent_id) WHERE is_enabled = true;

ALTER TABLE agent_knowledge_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_knowledge_assignments_policy ON agent_knowledge_assignments FOR ALL
    USING (agent_id IN (SELECT id FROM agents WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())));

COMMENT ON TABLE agent_knowledge_assignments IS 'Links agents to their knowledge sources for RAG';

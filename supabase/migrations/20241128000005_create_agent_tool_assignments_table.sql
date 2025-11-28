-- Migration: Create agent_tool_assignments table
-- Description: Links agents to their available tools
-- Author: Prisma Glow Team
-- Date: 2024-11-28

CREATE TABLE IF NOT EXISTS agent_tool_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES agent_tools(id) ON DELETE CASCADE,
    
    -- Configuration
    is_enabled BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,  -- Whether agent must use this tool
    priority INTEGER DEFAULT 0,  -- Order of tool preference
    
    -- Usage constraints
    max_calls_per_execution INTEGER,  -- Limit tool calls per execution
    timeout_ms INTEGER DEFAULT 30000,  -- Timeout in milliseconds
    
    -- Metadata
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, tool_id)
);

CREATE INDEX idx_agent_tool_assignments_agent ON agent_tool_assignments(agent_id);
CREATE INDEX idx_agent_tool_assignments_tool ON agent_tool_assignments(tool_id);
CREATE INDEX idx_agent_tool_assignments_enabled ON agent_tool_assignments(agent_id) WHERE is_enabled = true;

ALTER TABLE agent_tool_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_tool_assignments_select_policy ON agent_tool_assignments FOR SELECT
    USING (agent_id IN (SELECT id FROM agents WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())));

CREATE POLICY agent_tool_assignments_modify_policy ON agent_tool_assignments FOR ALL
    USING (agent_id IN (SELECT id FROM agents WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner'))));

COMMENT ON TABLE agent_tool_assignments IS 'Links agents to their available tools';

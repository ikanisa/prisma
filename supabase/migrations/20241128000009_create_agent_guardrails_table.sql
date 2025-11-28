-- Migration: Create agent_guardrails table
-- Description: Defines safety and compliance rules for agents
-- Author: Prisma Glow Team
-- Date: 2024-11-28

CREATE TABLE IF NOT EXISTS agent_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Guardrail identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    guardrail_type VARCHAR(50) CHECK (guardrail_type IN (
        'content_filter',     -- Filter harmful content
        'compliance',         -- Regulatory compliance
        'scope_limit',        -- Limit agent scope
        'rate_limit',         -- Rate limiting
        'cost_limit',         -- Cost controls
        'custom'              -- Custom rule
    )),
    
    -- Rule definition
    rule_definition JSONB NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    action VARCHAR(50) CHECK (action IN ('warn', 'block', 'review', 'log')),
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_agent_guardrails_organization ON agent_guardrails(organization_id);
CREATE INDEX idx_agent_guardrails_type ON agent_guardrails(guardrail_type);
CREATE INDEX idx_agent_guardrails_enabled ON agent_guardrails(is_enabled) WHERE is_enabled = true;

ALTER TABLE agent_guardrails ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_guardrails_policy ON agent_guardrails FOR ALL
    USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

COMMENT ON TABLE agent_guardrails IS 'Safety and compliance rules for agents';

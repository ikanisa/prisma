-- Multi-Provider AI Agent System Migration
-- Created: 2025-11-28

-- Add provider column to agents table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents' AND column_name = 'provider'
    ) THEN
        ALTER TABLE agents ADD COLUMN provider VARCHAR(50) DEFAULT 'openai'
        CHECK (provider IN ('openai', 'gemini', 'anthropic'));
    END IF;
END $$;

-- Add provider_config column for provider-specific settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'agents' AND column_name = 'provider_config'
    ) THEN
        ALTER TABLE agents ADD COLUMN provider_config JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add providers array to tool_registry for multi-provider tools
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tool_registry' AND column_name = 'providers'
    ) THEN
        ALTER TABLE tool_registry ADD COLUMN providers TEXT[] DEFAULT '{openai}';
    END IF;
END $$;

-- Add provider_configs to tool_registry
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tool_registry' AND column_name = 'provider_configs'
    ) THEN
        ALTER TABLE tool_registry ADD COLUMN provider_configs JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create agent_handoffs table for tracking agent-to-agent handoffs
CREATE TABLE IF NOT EXISTS agent_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    to_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    context JSONB DEFAULT '{}',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_provider ON agents(provider);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_from ON agent_handoffs(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_to ON agent_handoffs(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_handoffs_status ON agent_handoffs(status);

-- Enable RLS on new table
ALTER TABLE agent_handoffs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for agent_handoffs
CREATE POLICY IF NOT EXISTS "Users can view handoffs in their org"
    ON agent_handoffs FOR SELECT
    USING (
        from_agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    );

-- Add comment
COMMENT ON TABLE agent_handoffs IS 'Tracks handoffs between agents in multi-agent workflows';
COMMENT ON COLUMN agents.provider IS 'AI provider (openai, gemini, anthropic)';
COMMENT ON COLUMN agents.provider_config IS 'Provider-specific configuration';
COMMENT ON COLUMN tool_registry.providers IS 'List of providers that support this tool';
COMMENT ON COLUMN tool_registry.provider_configs IS 'Provider-specific tool configurations';

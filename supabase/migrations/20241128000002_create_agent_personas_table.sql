-- Migration: Create agent_personas table
-- Description: Stores different persona configurations for AI agents (system prompts, behaviors, etc.)
-- Author: Prisma Glow Team
-- Date: 2024-11-28

-- Create agent_personas table
CREATE TABLE IF NOT EXISTS agent_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Persona identification
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    
    -- AI Configuration
    system_prompt TEXT NOT NULL,  -- Core persona/behavior definition
    model VARCHAR(100) DEFAULT 'gpt-4',  -- OpenAI model (gpt-4, gpt-4-turbo, gpt-3.5-turbo, etc.)
    temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 2000 CHECK (max_tokens > 0 AND max_tokens <= 128000),
    top_p DECIMAL(3,2) DEFAULT 1.0 CHECK (top_p >= 0 AND top_p <= 1),
    frequency_penalty DECIMAL(3,2) DEFAULT 0.0 CHECK (frequency_penalty >= -2 AND frequency_penalty <= 2),
    presence_penalty DECIMAL(3,2) DEFAULT 0.0 CHECK (presence_penalty >= -2 AND presence_penalty <= 2),
    
    -- Advanced Configuration
    response_format JSONB DEFAULT '{"type": "text"}',  -- text, json_object, json_schema
    stop_sequences TEXT[],  -- Custom stop sequences
    seed INTEGER,  -- For deterministic responses
    
    -- Persona metadata
    tags TEXT[],  -- For categorization/search
    capabilities TEXT[],  -- List of what this persona can do
    limitations TEXT[],  -- Known limitations
    example_prompts TEXT[],  -- Sample user prompts that work well
    
    -- Performance tracking
    usage_count INTEGER DEFAULT 0,  -- How many times used
    success_rate DECIMAL(5,2),  -- Percentage of successful interactions
    avg_response_time_ms INTEGER,  -- Average response time
    avg_tokens_used INTEGER,  -- Average tokens per interaction
    
    -- A/B Testing
    variant_group VARCHAR(50),  -- For A/B testing (e.g., 'control', 'variant-a')
    test_percentage DECIMAL(5,2),  -- What % of traffic gets this persona
    
    -- Lifecycle
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft',          -- Being developed
        'testing',        -- In testing
        'active',         -- Live and in use
        'deprecated',     -- Being phased out
        'archived'        -- No longer used
    )),
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    
    -- Ensure unique slug per agent
    UNIQUE(agent_id, slug)
);

-- Create indexes for performance
CREATE INDEX idx_agent_personas_agent ON agent_personas(agent_id);
CREATE INDEX idx_agent_personas_organization ON agent_personas(organization_id);
CREATE INDEX idx_agent_personas_status ON agent_personas(status) WHERE status = 'active';
CREATE INDEX idx_agent_personas_default ON agent_personas(agent_id, is_default) WHERE is_default = true;
CREATE INDEX idx_agent_personas_variant ON agent_personas(agent_id, variant_group) WHERE variant_group IS NOT NULL;
CREATE INDEX idx_agent_personas_tags ON agent_personas USING GIN(tags);
CREATE INDEX idx_agent_personas_created_at ON agent_personas(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_personas_updated_at
    BEFORE UPDATE ON agent_personas
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_personas_updated_at();

-- Ensure only one default persona per agent
CREATE OR REPLACE FUNCTION ensure_single_default_persona()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE agent_personas 
        SET is_default = false 
        WHERE agent_id = NEW.agent_id 
        AND id != NEW.id 
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_personas_single_default
    AFTER INSERT OR UPDATE OF is_default ON agent_personas
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_persona();

-- Enable Row Level Security (RLS)
ALTER TABLE agent_personas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view personas in their organization
CREATE POLICY agent_personas_select_policy ON agent_personas
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert personas if they have admin role
CREATE POLICY agent_personas_insert_policy ON agent_personas
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agent_personas.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Policy: Users can update personas if they have admin role
CREATE POLICY agent_personas_update_policy ON agent_personas
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agent_personas.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Policy: Users can delete personas if they have owner role
CREATE POLICY agent_personas_delete_policy ON agent_personas
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agent_personas.organization_id
            AND role = 'owner'
        )
    );

-- Add helpful comments
COMMENT ON TABLE agent_personas IS 'Different persona configurations for AI agents (system prompts, model settings, behaviors)';
COMMENT ON COLUMN agent_personas.system_prompt IS 'Core instruction/personality for the agent';
COMMENT ON COLUMN agent_personas.model IS 'OpenAI model to use (gpt-4, gpt-4-turbo, etc.)';
COMMENT ON COLUMN agent_personas.temperature IS 'Randomness in responses (0-2, higher = more creative)';
COMMENT ON COLUMN agent_personas.max_tokens IS 'Maximum response length in tokens';
COMMENT ON COLUMN agent_personas.is_default IS 'Whether this is the default persona for the agent';
COMMENT ON COLUMN agent_personas.variant_group IS 'A/B testing group identifier';
COMMENT ON COLUMN agent_personas.test_percentage IS 'Percentage of traffic for this persona variant';
COMMENT ON COLUMN agent_personas.capabilities IS 'List of what this persona can do';
COMMENT ON COLUMN agent_personas.limitations IS 'Known limitations of this persona';
COMMENT ON COLUMN agent_personas.example_prompts IS 'Sample user prompts that work well';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: agent_personas table created successfully';
    RAISE NOTICE 'Indexes created: 7 indexes for optimal query performance';
    RAISE NOTICE 'Triggers: Auto-update timestamp + single default persona enforcement';
    RAISE NOTICE 'RLS enabled: Row-level security policies active';
    RAISE NOTICE 'Ready to store persona configurations with A/B testing support';
END $$;

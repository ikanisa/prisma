-- Migration: Create agent_executions table
-- Description: Tracks all agent execution runs with inputs, outputs, and performance metrics
-- Author: Prisma Glow Team
-- Date: 2024-11-28

-- Create agent_executions table
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES agent_personas(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Execution context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID,  -- Groups related executions in a conversation
    parent_execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,  -- For multi-turn conversations
    
    -- Input/Output
    input_text TEXT NOT NULL,
    output_text TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Execution details
    model_used VARCHAR(100),
    temperature_used DECIMAL(3,2),
    execution_time_ms INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',        -- Queued, waiting to execute
        'running',        -- Currently executing
        'completed',      -- Successfully completed
        'failed',         -- Execution failed
        'cancelled',      -- User cancelled
        'timeout'         -- Execution timed out
    )),
    
    -- Error handling
    error_message TEXT,
    error_code VARCHAR(100),
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Cost tracking
    cost_usd DECIMAL(10,6),  -- Cost in USD
    
    -- Quality metrics
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    
    -- Tool usage (for function calling)
    tools_used JSONB,  -- Array of tools invoked
    tool_calls INTEGER DEFAULT 0,
    
    -- Context and metadata
    context_data JSONB,  -- Additional context passed to agent
    metadata JSONB,  -- Custom metadata
    tags TEXT[],
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_agent_executions_agent ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_persona ON agent_executions(persona_id);
CREATE INDEX idx_agent_executions_organization ON agent_executions(organization_id);
CREATE INDEX idx_agent_executions_user ON agent_executions(user_id);
CREATE INDEX idx_agent_executions_session ON agent_executions(session_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_started_at ON agent_executions(started_at DESC);
CREATE INDEX idx_agent_executions_completed_at ON agent_executions(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_agent_executions_flagged ON agent_executions(flagged) WHERE flagged = true;
CREATE INDEX idx_agent_executions_parent ON agent_executions(parent_execution_id) WHERE parent_execution_id IS NOT NULL;
CREATE INDEX idx_agent_executions_tags ON agent_executions USING GIN(tags);
CREATE INDEX idx_agent_executions_tools ON agent_executions USING GIN(tools_used);

-- Partial index for recent successful executions (for analytics)
CREATE INDEX idx_agent_executions_recent_success ON agent_executions(agent_id, completed_at DESC) 
    WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_executions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_executions_updated_at
    BEFORE UPDATE ON agent_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_executions_updated_at();

-- Auto-calculate total_tokens
CREATE OR REPLACE FUNCTION calculate_total_tokens()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.input_tokens IS NOT NULL AND NEW.output_tokens IS NOT NULL THEN
        NEW.total_tokens = NEW.input_tokens + NEW.output_tokens;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_executions_calculate_tokens
    BEFORE INSERT OR UPDATE OF input_tokens, output_tokens ON agent_executions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_tokens();

-- Auto-set completed_at when status changes to completed/failed
CREATE OR REPLACE FUNCTION set_completed_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('completed', 'failed', 'cancelled', 'timeout') AND OLD.status NOT IN ('completed', 'failed', 'cancelled', 'timeout') THEN
        NEW.completed_at = NOW();
        IF NEW.started_at IS NOT NULL THEN
            NEW.execution_time_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_executions_set_completed
    BEFORE UPDATE OF status ON agent_executions
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_timestamp();

-- Enable Row Level Security (RLS)
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy: Users can view executions in their organization
CREATE POLICY agent_executions_select_policy ON agent_executions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert their own executions
CREATE POLICY agent_executions_insert_policy ON agent_executions
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id 
            FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update their own executions
CREATE POLICY agent_executions_update_policy ON agent_executions
    FOR UPDATE
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agent_executions.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Policy: Only admins can delete executions
CREATE POLICY agent_executions_delete_policy ON agent_executions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = agent_executions.organization_id
            AND role IN ('admin', 'owner')
        )
    );

-- Add helpful comments
COMMENT ON TABLE agent_executions IS 'Tracks all agent execution runs with inputs, outputs, performance metrics, and costs';
COMMENT ON COLUMN agent_executions.session_id IS 'Groups related executions in a multi-turn conversation';
COMMENT ON COLUMN agent_executions.parent_execution_id IS 'Links to previous execution in a conversation chain';
COMMENT ON COLUMN agent_executions.input_text IS 'User input/prompt sent to the agent';
COMMENT ON COLUMN agent_executions.output_text IS 'Agent response/output';
COMMENT ON COLUMN agent_executions.execution_time_ms IS 'Time taken to execute in milliseconds';
COMMENT ON COLUMN agent_executions.cost_usd IS 'Execution cost in USD based on token usage';
COMMENT ON COLUMN agent_executions.user_rating IS 'User rating from 1-5 stars';
COMMENT ON COLUMN agent_executions.flagged IS 'Whether this execution was flagged for review';
COMMENT ON COLUMN agent_executions.tools_used IS 'JSON array of tools/functions called during execution';
COMMENT ON COLUMN agent_executions.context_data IS 'Additional context provided to the agent';

-- Create view for recent executions with agent details
CREATE OR REPLACE VIEW recent_agent_executions AS
SELECT 
    e.*,
    a.name as agent_name,
    a.slug as agent_slug,
    a.type as agent_type,
    p.name as persona_name,
    u.email as user_email
FROM agent_executions e
JOIN agents a ON e.agent_id = a.id
LEFT JOIN agent_personas p ON e.persona_id = p.id
LEFT JOIN auth.users u ON e.user_id = u.id
WHERE e.started_at > NOW() - INTERVAL '7 days'
ORDER BY e.started_at DESC;

-- Create view for execution analytics
CREATE OR REPLACE VIEW agent_execution_stats AS
SELECT 
    agent_id,
    COUNT(*) as total_executions,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
    AVG(execution_time_ms) FILTER (WHERE status = 'completed') as avg_execution_time_ms,
    AVG(total_tokens) FILTER (WHERE status = 'completed') as avg_tokens,
    SUM(cost_usd) as total_cost_usd,
    AVG(user_rating) FILTER (WHERE user_rating IS NOT NULL) as avg_rating,
    MAX(started_at) as last_execution_at
FROM agent_executions
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY agent_id;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed: agent_executions table created successfully';
    RAISE NOTICE 'Indexes created: 13 indexes for optimal query performance';
    RAISE NOTICE 'Triggers: Auto-update timestamp + token calculation + completion tracking';
    RAISE NOTICE 'Views created: recent_agent_executions, agent_execution_stats';
    RAISE NOTICE 'RLS enabled: Row-level security policies active';
    RAISE NOTICE 'Ready to track all agent executions with full audit trail';
END $$;

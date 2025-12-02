-- Agent Execution Tracking Migration
-- Created: 2025-11-30
-- Purpose: Track agent executions, conversations, and audit logs for production deployment

-- Agent Executions Table
-- Tracks every agent execution with metadata, usage, and results
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Execution details
    provider TEXT NOT NULL, -- 'openai' or 'gemini'
    model TEXT NOT NULL,
    input_text TEXT NOT NULL,
    output_text TEXT,

    -- Context and metadata
    context JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Tool calls and results
    tool_calls JSONB DEFAULT '[]'::jsonb,
    tool_results JSONB DEFAULT '[]'::jsonb,

    -- Usage tracking
    tokens_input INTEGER,
    tokens_output INTEGER,
    tokens_total INTEGER,
    cost_usd DECIMAL(10, 6),

    -- Execution status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
    error_message TEXT,

    -- Performance metrics
    duration_ms INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_executions_org_id ON agent_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at DESC);

-- Agent Conversations Table
-- Groups related agent executions into conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Conversation details
    title TEXT,
    agent_id TEXT NOT NULL,
    domain TEXT NOT NULL, -- tax, audit, accounting, corporate-services

    -- Conversation state
    status TEXT NOT NULL DEFAULT 'active', -- active, archived, deleted
    message_count INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_conversations_org_id ON agent_conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_id ON agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_status ON agent_conversations(status);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_last_message ON agent_conversations(last_message_at DESC);

-- Agent Conversation Messages Table
-- Individual messages within a conversation
CREATE TABLE IF NOT EXISTS agent_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,

    -- Message details
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation_id ON agent_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_execution_id ON agent_conversation_messages(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_conversation_messages(created_at);

-- Agent Audit Log Table
-- Comprehensive audit trail for compliance
CREATE TABLE IF NOT EXISTS agent_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who, what, when, where
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    agent_id TEXT NOT NULL,
    execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,

    -- Action details
    action TEXT NOT NULL, -- 'execute', 'create', 'update', 'delete'
    resource_type TEXT NOT NULL, -- 'agent', 'conversation', 'execution'
    resource_id UUID,

    -- Audit data
    before_state JSONB,
    after_state JSONB,
    changes JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,

    -- Compliance flags
    contains_pii BOOLEAN DEFAULT FALSE,
    data_classification TEXT, -- 'public', 'internal', 'confidential', 'restricted'

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_audit_org_id ON agent_audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_user_id ON agent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_agent_id ON agent_audit_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_audit_action ON agent_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_agent_audit_created_at ON agent_audit_log(created_at DESC);

-- Agent Usage Quotas Table
-- Track and enforce usage limits per organization
CREATE TABLE IF NOT EXISTS agent_usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Quota limits
    max_executions_per_day INTEGER DEFAULT 1000,
    max_executions_per_month INTEGER DEFAULT 30000,
    max_tokens_per_day INTEGER DEFAULT 1000000,
    max_tokens_per_month INTEGER DEFAULT 30000000,
    max_cost_per_day_usd DECIMAL(10, 2) DEFAULT 100.00,
    max_cost_per_month_usd DECIMAL(10, 2) DEFAULT 3000.00,

    -- Current usage (reset daily/monthly)
    executions_today INTEGER DEFAULT 0,
    executions_this_month INTEGER DEFAULT 0,
    tokens_today INTEGER DEFAULT 0,
    tokens_this_month INTEGER DEFAULT 0,
    cost_today_usd DECIMAL(10, 2) DEFAULT 0.00,
    cost_this_month_usd DECIMAL(10, 2) DEFAULT 0.00,

    -- Reset tracking
    last_daily_reset TIMESTAMPTZ DEFAULT NOW(),
    last_monthly_reset TIMESTAMPTZ DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(org_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_quotas_org_id ON agent_usage_quotas(org_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_agent_executions_updated_at
    BEFORE UPDATE ON agent_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_conversations_updated_at
    BEFORE UPDATE ON agent_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_quotas_updated_at
    BEFORE UPDATE ON agent_usage_quotas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_usage_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_executions
CREATE POLICY agent_executions_org_isolation ON agent_executions
    FOR ALL
    USING (org_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    ));

-- RLS Policies for agent_conversations
CREATE POLICY agent_conversations_org_isolation ON agent_conversations
    FOR ALL
    USING (org_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    ));

-- RLS Policies for agent_conversation_messages
CREATE POLICY agent_messages_via_conversation ON agent_conversation_messages
    FOR ALL
    USING (conversation_id IN (
        SELECT id FROM agent_conversations WHERE org_id IN (
            SELECT organization_id FROM memberships WHERE user_id = auth.uid()
        )
    ));

-- RLS Policies for agent_audit_log
CREATE POLICY agent_audit_org_isolation ON agent_audit_log
    FOR SELECT
    USING (org_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    ));

-- RLS Policies for agent_usage_quotas
CREATE POLICY agent_quotas_org_isolation ON agent_usage_quotas
    FOR ALL
    USING (org_id IN (
        SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    ));

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON agent_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON agent_conversations TO authenticated;
GRANT SELECT, INSERT ON agent_conversation_messages TO authenticated;
GRANT SELECT ON agent_audit_log TO authenticated;
GRANT SELECT ON agent_usage_quotas TO authenticated;

-- Comments for documentation
COMMENT ON TABLE agent_executions IS 'Tracks all agent execution requests with full context and results';
COMMENT ON TABLE agent_conversations IS 'Groups related agent interactions into conversations';
COMMENT ON TABLE agent_conversation_messages IS 'Individual messages within agent conversations';
COMMENT ON TABLE agent_audit_log IS 'Comprehensive audit trail for compliance and security';
COMMENT ON TABLE agent_usage_quotas IS 'Enforces usage limits and tracks consumption per organization';

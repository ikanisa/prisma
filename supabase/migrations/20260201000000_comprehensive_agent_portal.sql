-- Comprehensive AI Agent System Migration
-- This migration creates all tables needed for the AI Agent Portal
-- Including agents, personas, tools, knowledge sources, executions, and guardrails

-- ============================================
-- 1. Enhanced Agents Table
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'assistant', 'specialist', 'orchestrator', 'evaluator', 'autonomous'
    )),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'testing', 'active', 'deprecated', 'archived'
    )),
    is_public BOOLEAN DEFAULT false,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    parent_version_id UUID REFERENCES agents(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    UNIQUE(organization_id, slug, version)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_agents_org_status ON agents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents(created_by);

-- ============================================
-- 2. Agent Personas Table
-- ============================================
CREATE TABLE IF NOT EXISTS agent_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    system_prompt TEXT NOT NULL,
    personality_traits JSONB DEFAULT '[]',
    communication_style VARCHAR(50) DEFAULT 'professional' CHECK (
        communication_style IN ('professional', 'friendly', 'concise', 'detailed', 'technical')
    ),
    capabilities JSONB DEFAULT '[]',
    limitations JSONB DEFAULT '[]',
    context_window_size INTEGER DEFAULT 128000,
    max_output_tokens INTEGER DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    top_p DECIMAL(3,2) DEFAULT 0.9,
    frequency_penalty DECIMAL(3,2) DEFAULT 0.0,
    presence_penalty DECIMAL(3,2) DEFAULT 0.0,
    content_filters JSONB DEFAULT '{}',
    pii_handling VARCHAR(50) DEFAULT 'redact' CHECK (
        pii_handling IN ('redact', 'mask', 'warn', 'allow')
    ),
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_personas_agent ON agent_personas(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_personas_active ON agent_personas(agent_id, is_active) WHERE is_active = true;

-- ============================================
-- 3. Agent Tools Registry
-- ============================================
CREATE TABLE IF NOT EXISTS agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    implementation_type VARCHAR(50) NOT NULL CHECK (implementation_type IN (
        'function', 'api_call', 'database_query', 'file_operation', 'workflow'
    )),
    implementation_config JSONB NOT NULL,
    required_permissions JSONB DEFAULT '[]',
    rate_limit INTEGER,
    cost_per_call DECIMAL(10,4) DEFAULT 0,
    is_destructive BOOLEAN DEFAULT false,
    requires_confirmation BOOLEAN DEFAULT false,
    audit_level VARCHAR(50) DEFAULT 'standard' CHECK (
        audit_level IN ('none', 'basic', 'standard', 'detailed')
    ),
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN ('active', 'deprecated', 'disabled')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_agent_tools_category ON agent_tools(category);
CREATE INDEX IF NOT EXISTS idx_agent_tools_status ON agent_tools(status);

-- ============================================
-- 4. Agent-Tool Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS agent_tool_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES agent_tools(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_config JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_assignments_agent ON agent_tool_assignments(agent_id);

-- ============================================
-- 5. Knowledge Sources
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'document', 'database', 'api', 'website', 'manual'
    )),
    source_config JSONB NOT NULL,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    chunk_size INTEGER DEFAULT 1000,
    chunk_overlap INTEGER DEFAULT 200,
    sync_frequency VARCHAR(50) DEFAULT 'manual' CHECK (
        sync_frequency IN ('manual', 'hourly', 'daily', 'weekly')
    ),
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (
        sync_status IN ('pending', 'syncing', 'synced', 'failed')
    ),
    document_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_org ON knowledge_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_type ON knowledge_sources(source_type);

-- ============================================
-- 6. Agent-Knowledge Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS agent_knowledge_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    knowledge_source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    retrieval_strategy VARCHAR(50) DEFAULT 'similarity' CHECK (
        retrieval_strategy IN ('similarity', 'keyword', 'hybrid')
    ),
    top_k INTEGER DEFAULT 5,
    similarity_threshold DECIMAL(3,2) DEFAULT 0.7,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, knowledge_source_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_assignments_agent ON agent_knowledge_assignments(agent_id);

-- ============================================
-- 7. Agent Executions (Logging)
-- ============================================
CREATE TABLE IF NOT EXISTS agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES agent_personas(id),
    input_text TEXT NOT NULL,
    input_tokens INTEGER,
    output_text TEXT,
    output_tokens INTEGER,
    latency_ms INTEGER,
    model_used VARCHAR(100),
    tools_invoked JSONB DEFAULT '[]',
    knowledge_retrieved JSONB DEFAULT '[]',
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    auto_eval_score DECIMAL(3,2),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    session_id UUID,
    estimated_cost DECIMAL(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON agent_executions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user ON agent_executions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session ON agent_executions(session_id);

-- ============================================
-- 8. Agent Learning Examples
-- ============================================
CREATE TABLE IF NOT EXISTS agent_learning_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    example_type VARCHAR(50) NOT NULL CHECK (example_type IN (
        'positive', 'negative', 'correction', 'demonstration'
    )),
    input_text TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    actual_output TEXT,
    conversation_id UUID,
    message_id UUID,
    tags JSONB DEFAULT '[]',
    importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    is_approved BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_examples_agent ON agent_learning_examples(agent_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_learning_examples_type ON agent_learning_examples(example_type);

-- ============================================
-- 9. Agent Guardrails
-- ============================================
CREATE TABLE IF NOT EXISTS agent_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'input_filter', 'output_filter', 'topic_block', 
        'rate_limit', 'cost_limit', 'tool_restriction'
    )),
    rule_config JSONB NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'block', 'warn', 'modify', 'log', 'escalate'
    )),
    priority INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardrails_org ON agent_guardrails(organization_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_type ON agent_guardrails(rule_type);

-- ============================================
-- 10. Agent-Guardrail Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS agent_guardrail_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    guardrail_id UUID NOT NULL REFERENCES agent_guardrails(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, guardrail_id)
);

CREATE INDEX IF NOT EXISTS idx_guardrail_assignments_agent ON agent_guardrail_assignments(agent_id);

-- ============================================
-- 11. Agent Versions History
-- ============================================
CREATE TABLE IF NOT EXISTS agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL,
    changelog TEXT,
    snapshot JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_versions_agent ON agent_versions(agent_id, created_at DESC);

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_tool_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_knowledge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_guardrail_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;

-- Agents policies
CREATE POLICY "Users can view agents in their organization" ON agents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
        OR is_public = true
    );

CREATE POLICY "Users can create agents in their organization" ON agents
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update agents in their organization" ON agents
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete agents in their organization" ON agents
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Personas policies (inherit from agent)
CREATE POLICY "Users can manage personas for their agents" ON agent_personas
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Tools policies
CREATE POLICY "Users can view tools" ON agent_tools
    FOR SELECT USING (
        organization_id IS NULL 
        OR organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage org tools" ON agent_tools
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Tool assignments policies
CREATE POLICY "Users can manage tool assignments" ON agent_tool_assignments
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Knowledge sources policies
CREATE POLICY "Users can manage knowledge sources" ON knowledge_sources
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Knowledge assignments policies
CREATE POLICY "Users can manage knowledge assignments" ON agent_knowledge_assignments
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Executions policies
CREATE POLICY "Users can view executions in their organization" ON agent_executions
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Users can create executions" ON agent_executions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own executions" ON agent_executions
    FOR UPDATE USING (user_id = auth.uid());

-- Learning examples policies
CREATE POLICY "Users can manage learning examples" ON agent_learning_examples
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Guardrails policies
CREATE POLICY "Users can manage guardrails" ON agent_guardrails
    FOR ALL USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_members 
            WHERE user_id = auth.uid()
        )
    );

-- Guardrail assignments policies
CREATE POLICY "Users can manage guardrail assignments" ON agent_guardrail_assignments
    FOR ALL USING (
        agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Versions policies
CREATE POLICY "Users can view agent versions" ON agent_versions
    FOR SELECT USING (
        agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create agent versions" ON agent_versions
    FOR INSERT WITH CHECK (
        agent_id IN (
            SELECT id FROM agents WHERE organization_id IN (
                SELECT organization_id FROM organization_members 
                WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================
-- Updated_at Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_personas_updated_at
    BEFORE UPDATE ON agent_personas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_tools_updated_at
    BEFORE UPDATE ON agent_tools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_sources_updated_at
    BEFORE UPDATE ON knowledge_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_guardrails_updated_at
    BEFORE UPDATE ON agent_guardrails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Analytics Views
-- ============================================
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
    agent_id,
    COUNT(*) as total_executions,
    AVG(latency_ms) as avg_latency_ms,
    AVG(user_rating) as avg_rating,
    SUM(estimated_cost) as total_cost,
    COUNT(*) FILTER (WHERE user_rating >= 4) * 100.0 / NULLIF(COUNT(*), 0) as satisfaction_rate
FROM agent_executions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY agent_id;

CREATE OR REPLACE VIEW daily_execution_metrics AS
SELECT 
    DATE(created_at) as date,
    agent_id,
    COUNT(*) as execution_count,
    AVG(latency_ms) as avg_latency,
    SUM(input_tokens + output_tokens) as total_tokens,
    SUM(estimated_cost) as daily_cost
FROM agent_executions
GROUP BY DATE(created_at), agent_id;

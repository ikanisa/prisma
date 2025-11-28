-- ============================================
-- AI AGENT SYSTEM COMPREHENSIVE SCHEMA
-- Based on audit and redesign recommendations
-- ============================================

-- Agents Table (Enhanced)
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    
    -- Classification
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'assistant', 'specialist', 'orchestrator', 'evaluator', 'autonomous'
    )),
    category VARCHAR(100), -- 'accounting', 'audit', 'tax', 'general'
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'testing', 'active', 'deprecated', 'archived'
    )),
    is_public BOOLEAN DEFAULT false,
    
    -- Versioning
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    parent_version_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    UNIQUE(organization_id, slug, version)
);

CREATE INDEX IF NOT EXISTS idx_agents_org_status ON public.agents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_agents_type_category ON public.agents(type, category);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agent Personas (System Instructions)
CREATE TABLE IF NOT EXISTS public.agent_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255), -- 'Senior Auditor', 'Tax Specialist', etc.
    
    -- System Instructions
    system_prompt TEXT NOT NULL,
    personality_traits JSONB DEFAULT '[]'::jsonb, -- ['professional', 'thorough', 'patient']
    communication_style VARCHAR(50) DEFAULT 'professional',
    
    -- Capabilities
    capabilities JSONB DEFAULT '[]'::jsonb, -- What the agent CAN do
    limitations JSONB DEFAULT '[]'::jsonb, -- What the agent CANNOT do
    
    -- Context Windows
    context_window_size INTEGER DEFAULT 128000,
    max_output_tokens INTEGER DEFAULT 4096,
    
    -- Behavior Settings
    temperature DECIMAL(3,2) DEFAULT 0.7,
    top_p DECIMAL(3,2) DEFAULT 0.9,
    frequency_penalty DECIMAL(3,2) DEFAULT 0.0,
    presence_penalty DECIMAL(3,2) DEFAULT 0.0,
    
    -- Safety
    content_filters JSONB DEFAULT '{}'::jsonb,
    pii_handling VARCHAR(50) DEFAULT 'redact',
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_personas_agent ON public.agent_personas(agent_id, is_active);

ALTER TABLE public.agent_personas ENABLE ROW LEVEL SECURITY;

-- Agent Tools
CREATE TABLE IF NOT EXISTS public.agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Classification
    category VARCHAR(100) NOT NULL, -- 'data_retrieval', 'calculation', 'external_api', etc.
    
    -- Schema (OpenAPI-style)
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    
    -- Implementation
    implementation_type VARCHAR(50) NOT NULL CHECK (implementation_type IN (
        'function', 'api_call', 'database_query', 'file_operation', 'workflow'
    )),
    implementation_config JSONB NOT NULL,
    
    -- Permissions
    required_permissions JSONB DEFAULT '[]'::jsonb,
    rate_limit INTEGER, -- calls per minute
    cost_per_call DECIMAL(10,4) DEFAULT 0,
    
    -- Safety
    is_destructive BOOLEAN DEFAULT false,
    requires_confirmation BOOLEAN DEFAULT false,
    audit_level VARCHAR(50) DEFAULT 'standard',
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_agent_tools_org_category ON public.agent_tools(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_agent_tools_status ON public.agent_tools(status);

ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;

-- Agent-Tool Assignments
CREATE TABLE IF NOT EXISTS public.agent_tool_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES public.agent_tools(id) ON DELETE CASCADE,
    
    -- Override settings
    is_enabled BOOLEAN DEFAULT true,
    custom_config JSONB,
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_assignments_agent ON public.agent_tool_assignments(agent_id);

ALTER TABLE public.agent_tool_assignments ENABLE ROW LEVEL SECURITY;

-- Knowledge Sources (Enhanced RAG)
CREATE TABLE IF NOT EXISTS public.agent_knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Source Type
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'document', 'database', 'api', 'website', 'manual'
    )),
    source_config JSONB NOT NULL,
    
    -- Embedding
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    chunk_size INTEGER DEFAULT 1000,
    chunk_overlap INTEGER DEFAULT 200,
    
    -- Sync
    sync_frequency VARCHAR(50) DEFAULT 'manual',
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',
    
    -- Stats
    document_count INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_org ON public.agent_knowledge_sources(organization_id);

ALTER TABLE public.agent_knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Agent-Knowledge Assignments
CREATE TABLE IF NOT EXISTS public.agent_knowledge_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    knowledge_source_id UUID NOT NULL REFERENCES public.agent_knowledge_sources(id) ON DELETE CASCADE,
    
    -- Retrieval Settings
    retrieval_strategy VARCHAR(50) DEFAULT 'similarity',
    top_k INTEGER DEFAULT 5,
    similarity_threshold DECIMAL(3,2) DEFAULT 0.7,
    
    -- Priority
    priority INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(agent_id, knowledge_source_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_knowledge_assignments_agent ON public.agent_knowledge_assignments(agent_id);

ALTER TABLE public.agent_knowledge_assignments ENABLE ROW LEVEL SECURITY;

-- Agent Learning Examples
CREATE TABLE IF NOT EXISTS public.agent_learning_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    
    -- Example Type
    example_type VARCHAR(50) NOT NULL CHECK (example_type IN (
        'positive', 'negative', 'correction', 'demonstration'
    )),
    
    -- Content
    input_text TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    actual_output TEXT,
    
    -- Context
    conversation_id UUID,
    message_id UUID,
    
    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    importance INTEGER DEFAULT 1, -- 1-5
    
    -- Review
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    is_approved BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_examples_agent ON public.agent_learning_examples(agent_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_learning_examples_type ON public.agent_learning_examples(example_type);

ALTER TABLE public.agent_learning_examples ENABLE ROW LEVEL SECURITY;

-- Agent Executions (Enhanced Logging)
CREATE TABLE IF NOT EXISTS public.agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    persona_id UUID REFERENCES public.agent_personas(id) ON DELETE SET NULL,
    
    -- Request
    input_text TEXT NOT NULL,
    input_tokens INTEGER,
    
    -- Response
    output_text TEXT,
    output_tokens INTEGER,
    
    -- Performance
    latency_ms INTEGER,
    model_used VARCHAR(100),
    
    -- Tools Used
    tools_invoked JSONB DEFAULT '[]'::jsonb,
    knowledge_retrieved JSONB DEFAULT '[]'::jsonb,
    
    -- Evaluation
    user_rating INTEGER, -- 1-5
    user_feedback TEXT,
    auto_eval_score DECIMAL(3,2),
    
    -- Metadata
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_id UUID,
    
    -- Cost
    estimated_cost DECIMAL(10,6),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_agent ON public.agent_executions(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user ON public.agent_executions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_org ON public.agent_executions(organization_id, created_at DESC);

ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- Agent Guardrails
CREATE TABLE IF NOT EXISTS public.agent_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Rule
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'input_filter', 'output_filter', 'topic_block', 
        'rate_limit', 'cost_limit', 'tool_restriction'
    )),
    rule_config JSONB NOT NULL,
    
    -- Action
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'block', 'warn', 'modify', 'log', 'escalate'
    )),
    
    -- Priority
    priority INTEGER DEFAULT 0,
    is_enabled BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_guardrails_org ON public.agent_guardrails(organization_id);

ALTER TABLE public.agent_guardrails ENABLE ROW LEVEL SECURITY;

-- Agent-Guardrail Assignments
CREATE TABLE IF NOT EXISTS public.agent_guardrail_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    guardrail_id UUID NOT NULL REFERENCES public.agent_guardrails(id) ON DELETE CASCADE,
    
    is_enabled BOOLEAN DEFAULT true,
    
    UNIQUE(agent_id, guardrail_id)
);

ALTER TABLE public.agent_guardrail_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Agents
CREATE POLICY agents_org_read ON public.agents
    FOR SELECT USING (public.is_member_of(organization_id) OR is_public = true);

CREATE POLICY agents_org_write ON public.agents
    FOR ALL USING (public.has_min_role(organization_id, 'MANAGER'::public.role_level))
    WITH CHECK (public.has_min_role(organization_id, 'MANAGER'::public.role_level));

-- Agent Personas
CREATE POLICY agent_personas_org_read ON public.agent_personas
    FOR SELECT USING (
        public.is_member_of((SELECT organization_id FROM public.agents WHERE id = agent_id))
    );

CREATE POLICY agent_personas_org_write ON public.agent_personas
    FOR ALL USING (
        public.has_min_role((SELECT organization_id FROM public.agents WHERE id = agent_id), 'MANAGER'::public.role_level)
    )
    WITH CHECK (
        public.has_min_role((SELECT organization_id FROM public.agents WHERE id = agent_id), 'MANAGER'::public.role_level)
    );

-- Agent Tools
CREATE POLICY agent_tools_org_read ON public.agent_tools
    FOR SELECT USING (public.is_member_of(organization_id) OR organization_id IS NULL);

CREATE POLICY agent_tools_org_write ON public.agent_tools
    FOR ALL USING (
        organization_id IS NULL AND public.has_min_role(NULL, 'SYSTEM_ADMIN'::public.role_level)
        OR organization_id IS NOT NULL AND public.has_min_role(organization_id, 'MANAGER'::public.role_level)
    );

-- Agent Tool Assignments
CREATE POLICY agent_tool_assignments_org_read ON public.agent_tool_assignments
    FOR SELECT USING (
        public.is_member_of((SELECT organization_id FROM public.agents WHERE id = agent_id))
    );

CREATE POLICY agent_tool_assignments_org_write ON public.agent_tool_assignments
    FOR ALL USING (
        public.has_min_role((SELECT organization_id FROM public.agents WHERE id = agent_id), 'MANAGER'::public.role_level)
    );

-- Knowledge Sources
CREATE POLICY agent_knowledge_sources_org_read ON public.agent_knowledge_sources
    FOR SELECT USING (public.is_member_of(organization_id));

CREATE POLICY agent_knowledge_sources_org_write ON public.agent_knowledge_sources
    FOR ALL USING (public.has_min_role(organization_id, 'MANAGER'::public.role_level));

-- Knowledge Assignments
CREATE POLICY agent_knowledge_assignments_org_read ON public.agent_knowledge_assignments
    FOR SELECT USING (
        public.is_member_of((SELECT organization_id FROM public.agents WHERE id = agent_id))
    );

CREATE POLICY agent_knowledge_assignments_org_write ON public.agent_knowledge_assignments
    FOR ALL USING (
        public.has_min_role((SELECT organization_id FROM public.agents WHERE id = agent_id), 'MANAGER'::public.role_level)
    );

-- Learning Examples
CREATE POLICY agent_learning_examples_org_read ON public.agent_learning_examples
    FOR SELECT USING (
        public.is_member_of((SELECT organization_id FROM public.agents WHERE id = agent_id))
    );

CREATE POLICY agent_learning_examples_org_write ON public.agent_learning_examples
    FOR ALL USING (
        public.is_member_of((SELECT organization_id FROM public.agents WHERE id = agent_id))
    );

-- Executions
CREATE POLICY agent_executions_org_read ON public.agent_executions
    FOR SELECT USING (public.is_member_of(organization_id));

CREATE POLICY agent_executions_org_write ON public.agent_executions
    FOR INSERT WITH CHECK (public.is_member_of(organization_id));

-- Guardrails
CREATE POLICY agent_guardrails_org_read ON public.agent_guardrails
    FOR SELECT USING (public.is_member_of(organization_id) OR organization_id IS NULL);

CREATE POLICY agent_guardrails_org_write ON public.agent_guardrails
    FOR ALL USING (
        organization_id IS NULL AND public.has_min_role(NULL, 'SYSTEM_ADMIN'::public.role_level)
        OR organization_id IS NOT NULL AND public.has_min_role(organization_id, 'MANAGER'::public.role_level)
    );

-- Guardrail Assignments
CREATE POLICY agent_guardrail_assignments_org_read ON public.agent_guardrail_assignments
    FOR SELECT USING (
        public.is_member_of((SELECT organization_id FROM public.agents WHERE id = agent_id))
    );

CREATE POLICY agent_guardrail_assignments_org_write ON public.agent_guardrail_assignments
    FOR ALL USING (
        public.has_min_role((SELECT organization_id FROM public.agents WHERE id = agent_id), 'MANAGER'::public.role_level)
    );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER trg_agents_touch
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_agent_personas_touch
    BEFORE UPDATE ON public.agent_personas
    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_agent_tools_touch
    BEFORE UPDATE ON public.agent_tools
    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_agent_knowledge_sources_touch
    BEFORE UPDATE ON public.agent_knowledge_sources
    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- ============================================
-- SEED DATA: Built-in Tools
-- ============================================

-- RAG Search Tool
INSERT INTO public.agent_tools (
    id,
    organization_id,
    name,
    slug,
    description,
    category,
    input_schema,
    output_schema,
    implementation_type,
    implementation_config,
    is_destructive,
    requires_confirmation,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    NULL, -- System tool
    'RAG Search',
    'rag_search',
    'Search the knowledge base using semantic similarity',
    'data_retrieval',
    '{"type": "object", "properties": {"query": {"type": "string"}, "top_k": {"type": "number"}}, "required": ["query"]}'::jsonb,
    '{"type": "object", "properties": {"results": {"type": "array"}}}'::jsonb,
    'function',
    '{"function_name": "search_knowledge_base", "module": "server.rag"}'::jsonb,
    false,
    false,
    'active'
) ON CONFLICT (organization_id, slug) WHERE organization_id IS NULL DO NOTHING;

-- Create Task Tool
INSERT INTO public.agent_tools (
    id,
    organization_id,
    name,
    slug,
    description,
    category,
    input_schema,
    output_schema,
    implementation_type,
    implementation_config,
    is_destructive,
    requires_confirmation,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    NULL,
    'Create Task',
    'create_task',
    'Create a new task in the system',
    'workflow',
    '{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "assignee": {"type": "string"}}, "required": ["title"]}'::jsonb,
    '{"type": "object", "properties": {"task_id": {"type": "string"}}}'::jsonb,
    'database_query',
    '{"table": "tasks", "operation": "insert"}'::jsonb,
    false,
    true,
    'active'
) ON CONFLICT (organization_id, slug) WHERE organization_id IS NULL DO NOTHING;

-- Send Email Tool
INSERT INTO public.agent_tools (
    id,
    organization_id,
    name,
    slug,
    description,
    category,
    input_schema,
    output_schema,
    implementation_type,
    implementation_config,
    is_destructive,
    requires_confirmation,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    NULL,
    'Send Email',
    'send_email',
    'Send an email to specified recipients',
    'external_api',
    '{"type": "object", "properties": {"to": {"type": "array"}, "subject": {"type": "string"}, "body": {"type": "string"}}, "required": ["to", "subject", "body"]}'::jsonb,
    '{"type": "object", "properties": {"success": {"type": "boolean"}, "message_id": {"type": "string"}}}'::jsonb,
    'api_call',
    '{"endpoint": "/api/email/send", "method": "POST"}'::jsonb,
    true,
    true,
    'active'
) ON CONFLICT (organization_id, slug) WHERE organization_id IS NULL DO NOTHING;

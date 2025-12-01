-- ============================================
-- CURATED KNOWLEDGE BASE (CKB) SCHEMA
-- Deep Search + Curated Knowledge Base + Retrieval Guardrails
-- ============================================
-- Implements the structured knowledge architecture for AI agent learning
-- with authoritative sources, verification levels, and metadata tracking.

-- ============================================
-- ENUMS FOR KNOWLEDGE CLASSIFICATION
-- ============================================

-- Standard/Document types following the problem statement categories
CREATE TYPE public.knowledge_standard_type AS ENUM (
    'IFRS',           -- International Financial Reporting Standards
    'IAS',            -- International Accounting Standards  
    'IFRIC',          -- IFRS Interpretations Committee
    'ISA',            -- International Standards on Auditing
    'GAAP',           -- Generally Accepted Accounting Principles
    'TAX_LAW',        -- Tax legislation
    'ACCA',           -- ACCA study materials and guidance
    'CPA',            -- CPA materials and guidance
    'OECD',           -- OECD guidelines (BEPS, international tax)
    'INTERNAL',       -- Company-specific internal policies
    'SECONDARY',      -- Big Four summaries, university notes
    'REGULATORY',     -- National regulatory publications
    'CASE_STUDY',     -- Worked examples and case studies
    'TEMPLATE',       -- Standard templates and forms
    'CALCULATOR'      -- Formula models and calculators
);

-- Verification levels (primary sources override secondary)
CREATE TYPE public.knowledge_verification_level AS ENUM (
    'primary',        -- Authoritative primary sources (IFRS, ISA, tax laws)
    'secondary',      -- Interpretation materials (Big Four, ACCA)
    'tertiary'        -- Internal policies, templates
);

-- Source priority for conflict resolution
CREATE TYPE public.knowledge_source_priority AS ENUM (
    'authoritative',  -- Cannot be overridden
    'regulatory',     -- Local law overrides global in tax matters
    'interpretive',   -- Can be cited but not as final authority
    'supplementary'   -- Background/context only
);

-- ============================================
-- CURATED KNOWLEDGE BASE TABLE
-- ============================================
-- Main table storing structured knowledge entries with full metadata.
-- Each entry maps to chunk_size: 1,000–2,000 chars for semantic retrieval.

CREATE TABLE IF NOT EXISTS public.curated_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    title TEXT NOT NULL,
    slug VARCHAR(255) NOT NULL,
    section_key VARCHAR(100),  -- Hierarchical key like "IAS 21.9", "ISA 540.12"
    
    -- Classification
    standard_type public.knowledge_standard_type NOT NULL,
    verification_level public.knowledge_verification_level NOT NULL DEFAULT 'secondary',
    source_priority public.knowledge_source_priority NOT NULL DEFAULT 'interpretive',
    
    -- Jurisdiction & Scope
    jurisdiction VARCHAR(10)[] DEFAULT '{}',  -- ISO codes: 'INTL', 'MT', 'RW', 'US', etc.
    effective_date DATE,
    expiry_date DATE,
    version VARCHAR(50),
    
    -- Content
    summary TEXT,
    full_text TEXT NOT NULL,
    
    -- Source Attribution
    source_url TEXT,
    source_document_id UUID,  -- Reference to knowledge_documents if ingested
    
    -- Semantic Search Support
    embedding vector(1536),
    embed_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    
    -- Metadata & Tags
    tags TEXT[] DEFAULT '{}',  -- e.g., 'IFRS 3', 'IAS 21', 'Rwanda VAT 2023'
    domain VARCHAR(100),       -- e.g., 'financial_reporting', 'audit', 'tax'
    metadata JSONB DEFAULT '{}',
    
    -- Quality & Usage
    usage_count INTEGER DEFAULT 0,
    citation_count INTEGER DEFAULT 0,
    last_cited_at TIMESTAMPTZ,
    quality_score DECIMAL(3,2) CHECK (quality_score BETWEEN 0 AND 1),
    
    -- Lifecycle
    is_active BOOLEAN DEFAULT true,
    is_outdated BOOLEAN DEFAULT false,
    superseded_by UUID REFERENCES public.curated_knowledge_base(id),
    
    -- Audit Trail
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ckb_org_active ON public.curated_knowledge_base(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ckb_standard_type ON public.curated_knowledge_base(standard_type, verification_level);
CREATE INDEX IF NOT EXISTS idx_ckb_jurisdiction ON public.curated_knowledge_base USING GIN(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_ckb_tags ON public.curated_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_ckb_domain ON public.curated_knowledge_base(domain);
CREATE INDEX IF NOT EXISTS idx_ckb_section_key ON public.curated_knowledge_base(section_key);
CREATE INDEX IF NOT EXISTS idx_ckb_effective_date ON public.curated_knowledge_base(effective_date, expiry_date);

-- Vector similarity index for semantic search
CREATE INDEX IF NOT EXISTS idx_ckb_embedding ON public.curated_knowledge_base
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================
-- DEEP SEARCH AUTHORITATIVE SOURCES
-- ============================================
-- Registry of authoritative sources for Deep Search pipeline.

CREATE TABLE IF NOT EXISTS public.deep_search_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name TEXT NOT NULL,
    description TEXT,
    
    -- Source Configuration
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'ifrs_foundation',     -- IFRS Foundation
        'iaasb',               -- International Auditing and Assurance Standards Board
        'acca',                -- ACCA materials
        'cpa',                 -- CPA resources
        'oecd',                -- OECD guidelines
        'tax_authority',       -- National tax authorities
        'gaap',                -- Local GAAP documents
        'gazette',             -- National gazettes and public statutes
        'regulatory_pdf',      -- Regulatory PDF ingestion
        'company_policy',      -- Company-specific internal policies
        'big_four',            -- Big Four summaries (secondary)
        'academic'             -- University/academic materials (secondary)
    )),
    
    -- Access Configuration
    base_url TEXT,
    api_endpoint TEXT,
    requires_auth BOOLEAN DEFAULT false,
    auth_config JSONB,
    
    -- Priority & Trust
    verification_level public.knowledge_verification_level NOT NULL,
    source_priority public.knowledge_source_priority NOT NULL,
    trust_score DECIMAL(3,2) DEFAULT 1.0 CHECK (trust_score BETWEEN 0 AND 1),
    
    -- Scope
    jurisdictions VARCHAR(10)[] DEFAULT '{}',
    domains TEXT[] DEFAULT '{}',  -- 'audit', 'tax', 'financial_reporting'
    
    -- Sync Settings
    sync_enabled BOOLEAN DEFAULT false,
    sync_frequency_hours INTEGER DEFAULT 168,  -- Weekly
    last_synced_at TIMESTAMPTZ,
    next_sync_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deep_search_sources_type ON public.deep_search_sources(source_type, is_active);
CREATE INDEX IF NOT EXISTS idx_deep_search_sources_jurisdiction ON public.deep_search_sources USING GIN(jurisdictions);

-- ============================================
-- RETRIEVAL GUARDRAILS
-- ============================================
-- Rules and validations applied before agent responses.

CREATE TABLE IF NOT EXISTS public.retrieval_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Rule Type
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'source_verification',   -- Verify sources match question
        'conflict_resolution',   -- Handle source conflicts
        'jurisdiction_check',    -- Verify jurisdiction requirements
        'outdated_check',        -- Flag potentially outdated info
        'citation_required',     -- Require citations for certain topics
        'escalation_trigger',    -- Trigger human review
        'confidence_threshold',  -- Minimum confidence requirement
        'deep_search_trigger'    -- When to trigger Deep Search
    )),
    
    -- Rule Configuration
    config JSONB NOT NULL DEFAULT '{}',
    
    -- Conditions
    applies_to_domains TEXT[] DEFAULT '{}',
    applies_to_standards public.knowledge_standard_type[],
    min_confidence_score DECIMAL(3,2),
    
    -- Actions
    action_on_violation VARCHAR(50) NOT NULL CHECK (action_on_violation IN (
        'block',           -- Block the response
        'warn',            -- Add warning to response
        'escalate',        -- Escalate to human
        'deep_search',     -- Trigger Deep Search
        'add_disclaimer',  -- Add disclaimer
        'log_only'         -- Log for audit
    )),
    
    -- Priority (lower = higher priority)
    priority INTEGER DEFAULT 100,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardrails_org_active ON public.retrieval_guardrails(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guardrails_type ON public.retrieval_guardrails(rule_type, priority);

-- ============================================
-- REASONING TRACES
-- ============================================
-- Hidden from user but visible for auditing.

CREATE TABLE IF NOT EXISTS public.agent_reasoning_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    
    -- Context
    agent_id UUID NOT NULL,
    execution_id UUID,
    session_id UUID,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Query Information
    query_text TEXT NOT NULL,
    query_embedding vector(1536),
    
    -- Retrieval Details
    sources_consulted UUID[],  -- References to curated_knowledge_base entries
    deep_search_triggered BOOLEAN DEFAULT false,
    deep_search_sources UUID[],  -- References to deep_search_sources
    
    -- Guardrail Evaluation
    guardrails_evaluated UUID[],
    guardrails_triggered UUID[],
    guardrail_actions JSONB DEFAULT '[]',
    
    -- Reasoning Steps
    reasoning_steps JSONB NOT NULL DEFAULT '[]',
    /*
    Example structure:
    [
      {"step": 1, "action": "identify_topic", "result": "FX revaluation → IAS 21"},
      {"step": 2, "action": "retrieve_sources", "chunks": ["uuid1", "uuid2"]},
      {"step": 3, "action": "check_jurisdiction", "result": "Rwanda tax treatment needed"},
      {"step": 4, "action": "apply_reasoning", "citations": ["IAS 21.28-37"]},
      {"step": 5, "action": "verify_sources", "result": "all sources current"}
    ]
    */
    
    -- Final Output
    final_answer TEXT,
    citations JSONB DEFAULT '[]',  -- Specific clause references
    confidence_score DECIMAL(3,2),
    
    -- Performance
    retrieval_latency_ms INTEGER,
    reasoning_latency_ms INTEGER,
    total_latency_ms INTEGER,
    
    -- Audit Flags
    has_conflicts BOOLEAN DEFAULT false,
    requires_review BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reasoning_traces_org ON public.agent_reasoning_traces(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_agent ON public.agent_reasoning_traces(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reasoning_traces_review ON public.agent_reasoning_traces(requires_review, reviewed_at) WHERE requires_review = true;

-- ============================================
-- KNOWLEDGE BASE SEED DATA: Authoritative Sources
-- ============================================

INSERT INTO public.deep_search_sources (name, description, source_type, base_url, verification_level, source_priority, jurisdictions, domains) VALUES
    -- Primary Authoritative Sources
    ('IFRS Foundation', 'International Financial Reporting Standards Foundation - Official standards', 'ifrs_foundation', 'https://www.ifrs.org', 'primary', 'authoritative', ARRAY['INTL'], ARRAY['financial_reporting']),
    ('IAASB', 'International Auditing and Assurance Standards Board - Official auditing standards', 'iaasb', 'https://www.iaasb.org', 'primary', 'authoritative', ARRAY['INTL'], ARRAY['audit']),
    ('OECD Guidelines', 'OECD international tax guidelines including BEPS', 'oecd', 'https://www.oecd.org/tax', 'primary', 'authoritative', ARRAY['INTL'], ARRAY['tax']),
    
    -- Regulatory Sources
    ('RRA Rwanda', 'Rwanda Revenue Authority - Tax laws and regulations', 'tax_authority', 'https://www.rra.gov.rw', 'primary', 'regulatory', ARRAY['RW'], ARRAY['tax']),
    ('Commissioner for Revenue Malta', 'Malta tax authority - Tax laws and circulars', 'tax_authority', 'https://cfr.gov.mt', 'primary', 'regulatory', ARRAY['MT'], ARRAY['tax']),
    ('MFSA Malta', 'Malta Financial Services Authority - Regulatory guidelines', 'regulatory_pdf', 'https://www.mfsa.mt', 'primary', 'regulatory', ARRAY['MT'], ARRAY['financial_reporting', 'compliance']),
    
    -- Secondary Interpretation Sources
    ('ACCA Resources', 'ACCA study texts and technical articles', 'acca', 'https://www.accaglobal.com', 'secondary', 'interpretive', ARRAY['INTL'], ARRAY['audit', 'financial_reporting', 'tax']),
    ('CPA Resources', 'CPA Canada and US public libraries', 'cpa', 'https://www.cpacanada.ca', 'secondary', 'interpretive', ARRAY['CA', 'US'], ARRAY['audit', 'financial_reporting', 'tax']),
    ('PwC Insights', 'PwC technical guidance and summaries', 'big_four', 'https://www.pwc.com', 'secondary', 'interpretive', ARRAY['INTL'], ARRAY['audit', 'financial_reporting', 'tax']),
    ('KPMG Insights', 'KPMG technical guidance and summaries', 'big_four', 'https://home.kpmg', 'secondary', 'interpretive', ARRAY['INTL'], ARRAY['audit', 'financial_reporting', 'tax']),
    ('EY Insights', 'EY technical guidance and summaries', 'big_four', 'https://www.ey.com', 'secondary', 'interpretive', ARRAY['INTL'], ARRAY['audit', 'financial_reporting', 'tax']),
    ('Deloitte Insights', 'Deloitte technical guidance and summaries', 'big_four', 'https://www2.deloitte.com', 'secondary', 'interpretive', ARRAY['INTL'], ARRAY['audit', 'financial_reporting', 'tax'])
ON CONFLICT DO NOTHING;

-- ============================================
-- DEFAULT RETRIEVAL GUARDRAILS
-- ============================================

INSERT INTO public.retrieval_guardrails (organization_id, name, description, rule_type, config, action_on_violation, priority) VALUES
    -- Global rules (organization_id = NULL)
    (NULL, 'Primary Source Override', 'Primary sources always override secondary interpretation', 'source_verification', 
     '{"require_primary_for": ["tax_calculation", "legal_interpretation", "standard_citation"]}', 'deep_search', 10),
    
    (NULL, 'Local Law Priority', 'Local tax laws override global standards in tax matters', 'jurisdiction_check',
     '{"domains": ["tax"], "prefer_local": true}', 'add_disclaimer', 20),
    
    (NULL, 'IFRS Over GAAP', 'IFRS overrides GAAP when IFRS is adopted', 'conflict_resolution',
     '{"prefer": "IFRS", "when": "ifrs_adopted"}', 'log_only', 30),
    
    (NULL, 'Citation Required', 'All interpretations must cite specific clauses', 'citation_required',
     '{"require_clause_reference": true, "domains": ["audit", "financial_reporting", "tax"]}', 'warn', 40),
    
    (NULL, 'Outdated Source Check', 'Trigger Deep Search for sources older than 30 days', 'outdated_check',
     '{"max_age_days": 30, "domains": ["tax"]}', 'deep_search', 50),
    
    (NULL, 'Low Confidence Escalation', 'Escalate when confidence is below threshold', 'confidence_threshold',
     '{"min_confidence": 0.7}', 'escalate', 60),
    
    (NULL, 'Conflict Detection', 'Escalate when sources conflict', 'conflict_resolution',
     '{"action": "escalate_on_conflict"}', 'escalate', 70),
    
    (NULL, 'Missing Jurisdiction', 'Deep Search when jurisdiction info is missing', 'deep_search_trigger',
     '{"trigger_on": ["missing_jurisdiction", "ambiguous_law"]}', 'deep_search', 80)
ON CONFLICT DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.curated_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_search_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retrieval_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_reasoning_traces ENABLE ROW LEVEL SECURITY;

-- CKB Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curated_knowledge_base' AND policyname = 'ckb_org_read') THEN
        CREATE POLICY ckb_org_read ON public.curated_knowledge_base
            FOR SELECT USING (
                organization_id IS NULL 
                OR public.is_member_of(organization_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'curated_knowledge_base' AND policyname = 'ckb_org_write') THEN
        CREATE POLICY ckb_org_write ON public.curated_knowledge_base
            FOR ALL USING (
                organization_id IS NULL 
                OR public.has_min_role(organization_id, 'MANAGER')
            );
    END IF;
END $$;

-- Deep Search Sources Policies (global read, admin write)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'deep_search_sources' AND policyname = 'dss_read') THEN
        CREATE POLICY dss_read ON public.deep_search_sources FOR SELECT USING (true);
    END IF;
END $$;

-- Guardrails Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'retrieval_guardrails' AND policyname = 'guardrails_org_read') THEN
        CREATE POLICY guardrails_org_read ON public.retrieval_guardrails
            FOR SELECT USING (
                organization_id IS NULL 
                OR public.is_member_of(organization_id)
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'retrieval_guardrails' AND policyname = 'guardrails_org_write') THEN
        CREATE POLICY guardrails_org_write ON public.retrieval_guardrails
            FOR ALL USING (
                organization_id IS NULL 
                OR public.has_min_role(organization_id, 'ADMIN')
            );
    END IF;
END $$;

-- Reasoning Traces Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_reasoning_traces' AND policyname = 'traces_org_read') THEN
        CREATE POLICY traces_org_read ON public.agent_reasoning_traces
            FOR SELECT USING (public.is_member_of(organization_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_reasoning_traces' AND policyname = 'traces_org_insert') THEN
        CREATE POLICY traces_org_insert ON public.agent_reasoning_traces
            FOR INSERT WITH CHECK (public.is_member_of(organization_id));
    END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Semantic search with verification level priority
CREATE OR REPLACE FUNCTION public.search_curated_knowledge(
    p_org_id UUID,
    p_query_embedding vector(1536),
    p_jurisdictions VARCHAR(10)[] DEFAULT NULL,
    p_domains TEXT[] DEFAULT NULL,
    p_standard_types public.knowledge_standard_type[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 10,
    p_min_similarity DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
    knowledge_id UUID,
    title TEXT,
    section_key VARCHAR(100),
    summary TEXT,
    full_text TEXT,
    standard_type public.knowledge_standard_type,
    verification_level public.knowledge_verification_level,
    source_priority public.knowledge_source_priority,
    jurisdiction VARCHAR(10)[],
    tags TEXT[],
    source_url TEXT,
    similarity_score DECIMAL,
    is_outdated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ckb.id AS knowledge_id,
        ckb.title,
        ckb.section_key,
        ckb.summary,
        ckb.full_text,
        ckb.standard_type,
        ckb.verification_level,
        ckb.source_priority,
        ckb.jurisdiction,
        ckb.tags,
        ckb.source_url,
        ROUND((1 - (ckb.embedding <=> p_query_embedding))::numeric, 4) AS similarity_score,
        ckb.is_outdated
    FROM public.curated_knowledge_base ckb
    WHERE 
        ckb.is_active = true
        AND (ckb.organization_id IS NULL OR ckb.organization_id = p_org_id)
        AND (p_jurisdictions IS NULL OR ckb.jurisdiction && p_jurisdictions)
        AND (p_domains IS NULL OR ckb.domain = ANY(p_domains))
        AND (p_standard_types IS NULL OR ckb.standard_type = ANY(p_standard_types))
        AND (1 - (ckb.embedding <=> p_query_embedding)) >= p_min_similarity
    ORDER BY 
        -- Primary sources first
        CASE ckb.verification_level 
            WHEN 'primary' THEN 1 
            WHEN 'secondary' THEN 2 
            ELSE 3 
        END,
        -- Then by similarity
        ckb.embedding <=> p_query_embedding
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if Deep Search should be triggered
CREATE OR REPLACE FUNCTION public.should_trigger_deep_search(
    p_org_id UUID,
    p_domain TEXT,
    p_sources_found INTEGER,
    p_max_source_age_days INTEGER DEFAULT NULL,
    p_has_jurisdiction_match BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
DECLARE
    should_trigger BOOLEAN := false;
    guardrail RECORD;
BEGIN
    -- Check guardrails
    FOR guardrail IN 
        SELECT config, action_on_violation 
        FROM public.retrieval_guardrails
        WHERE is_active = true
        AND (organization_id IS NULL OR organization_id = p_org_id)
        AND rule_type IN ('deep_search_trigger', 'outdated_check')
        AND (applies_to_domains IS NULL OR p_domain = ANY(applies_to_domains))
        ORDER BY priority
    LOOP
        -- No sources found
        IF p_sources_found = 0 THEN
            should_trigger := true;
            EXIT;
        END IF;
        
        -- Outdated sources
        IF guardrail.config->>'max_age_days' IS NOT NULL AND p_max_source_age_days IS NOT NULL THEN
            IF p_max_source_age_days > (guardrail.config->>'max_age_days')::integer THEN
                should_trigger := true;
                EXIT;
            END IF;
        END IF;
        
        -- Missing jurisdiction
        IF NOT p_has_jurisdiction_match AND guardrail.config->'trigger_on' ? 'missing_jurisdiction' THEN
            should_trigger := true;
            EXIT;
        END IF;
    END LOOP;
    
    RETURN should_trigger;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log reasoning trace
CREATE OR REPLACE FUNCTION public.log_reasoning_trace(
    p_org_id UUID,
    p_agent_id UUID,
    p_query_text TEXT,
    p_reasoning_steps JSONB,
    p_sources_consulted UUID[],
    p_final_answer TEXT,
    p_citations JSONB,
    p_confidence_score DECIMAL,
    p_deep_search_triggered BOOLEAN DEFAULT false,
    p_guardrails_triggered UUID[] DEFAULT NULL,
    p_guardrail_actions JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    trace_id UUID;
BEGIN
    INSERT INTO public.agent_reasoning_traces (
        organization_id,
        agent_id,
        query_text,
        reasoning_steps,
        sources_consulted,
        final_answer,
        citations,
        confidence_score,
        deep_search_triggered,
        guardrails_triggered,
        guardrail_actions,
        requires_review
    ) VALUES (
        p_org_id,
        p_agent_id,
        p_query_text,
        p_reasoning_steps,
        p_sources_consulted,
        p_final_answer,
        p_citations,
        p_confidence_score,
        p_deep_search_triggered,
        p_guardrails_triggered,
        COALESCE(p_guardrail_actions, '[]'::jsonb),
        -- Mark for review if confidence is low or guardrails were triggered
        (p_confidence_score < 0.7 OR array_length(p_guardrails_triggered, 1) > 0)
    )
    RETURNING id INTO trace_id;
    
    RETURN trace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update usage statistics
CREATE OR REPLACE FUNCTION public.update_ckb_usage(p_knowledge_ids UUID[])
RETURNS VOID AS $$
BEGIN
    UPDATE public.curated_knowledge_base
    SET 
        usage_count = usage_count + 1,
        citation_count = citation_count + 1,
        last_cited_at = NOW()
    WHERE id = ANY(p_knowledge_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_ckb_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ckb_updated_at
    BEFORE UPDATE ON public.curated_knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ckb_updated_at();

CREATE TRIGGER trigger_guardrails_updated_at
    BEFORE UPDATE ON public.retrieval_guardrails
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ckb_updated_at();

CREATE TRIGGER trigger_deep_search_sources_updated_at
    BEFORE UPDATE ON public.deep_search_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ckb_updated_at();

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON public.curated_knowledge_base TO authenticated;
GRANT SELECT ON public.deep_search_sources TO authenticated;
GRANT SELECT ON public.retrieval_guardrails TO authenticated;
GRANT SELECT, INSERT ON public.agent_reasoning_traces TO authenticated;

COMMENT ON TABLE public.curated_knowledge_base IS 'Structured knowledge library with standards, definitions, worked examples, and metadata for AI agent retrieval';
COMMENT ON TABLE public.deep_search_sources IS 'Registry of authoritative sources for Deep Search pipeline';
COMMENT ON TABLE public.retrieval_guardrails IS 'Validation rules applied before agent responses to prevent hallucination';
COMMENT ON TABLE public.agent_reasoning_traces IS 'Audit trail of agent reasoning steps, hidden from users but visible for compliance';

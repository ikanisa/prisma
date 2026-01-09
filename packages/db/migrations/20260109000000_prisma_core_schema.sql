-- ============================================================================
-- Prisma Core Schema Migration
-- Version: 1.0.0
-- Date: 2026-01-09
-- 
-- This migration creates the core schema for Prisma Core:
-- - Tenant & access (firms, firm_memberships)
-- - Clients & eligibility (with financial institution blocking)
-- - Engagement workflow (engagements, tasks, documents)
-- - Evidence/workpapers (extractions, workpapers, issues)
-- - Agent traceability (agent_runs, agent_events, approvals)
-- - Playbooks/templates (playbooks, task_templates, doc_request_templates)
-- - Jurisdictions (RW, MT, CA ONLY)
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS: Strict Jurisdiction and Type Enforcement
-- ============================================================================

-- Jurisdiction enum: ONLY RW, MT, CA allowed
DO $$ BEGIN
    CREATE TYPE jurisdiction_code AS ENUM ('RW', 'MT', 'CA');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Engagement type enum
DO $$ BEGIN
    CREATE TYPE engagement_type AS ENUM ('accounting', 'audit', 'tax');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Client segment enum
DO $$ BEGIN
    CREATE TYPE client_segment AS ENUM ('self_employed', 'micro', 'small', 'medium');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Engagement phase enum
DO $$ BEGIN
    CREATE TYPE engagement_phase AS ENUM ('planning', 'fieldwork', 'completion', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Task status enum
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'review', 'completed', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Document status enum
DO $$ BEGIN
    CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'extracted', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Workpaper status enum
DO $$ BEGIN
    CREATE TYPE workpaper_status AS ENUM ('draft', 'review', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Issue severity enum
DO $$ BEGIN
    CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Approval decision enum
DO $$ BEGIN
    CREATE TYPE approval_decision AS ENUM ('pending', 'approved', 'rejected', 'needs_revision');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Organization role enum
DO $$ BEGIN
    CREATE TYPE org_role AS ENUM ('ADMIN', 'MANAGER', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Agent run status enum
DO $$ BEGIN
    CREATE TYPE agent_run_status AS ENUM ('running', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- JURISDICTIONS TABLE: Master list (RW, MT, CA only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS jurisdictions (
    code jurisdiction_code PRIMARY KEY,
    name TEXT NOT NULL,
    tax_authority TEXT NOT NULL,
    currency TEXT NOT NULL,
    vat_rate NUMERIC(5,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Constraint to ensure only valid jurisdictions
    CONSTRAINT valid_jurisdiction CHECK (code IN ('RW', 'MT', 'CA'))
);

-- Insert ONLY the three allowed jurisdictions
INSERT INTO jurisdictions (code, name, tax_authority, currency, vat_rate) VALUES
    ('RW', 'Rwanda', 'RRA (Rwanda Revenue Authority)', 'RWF', 0.18),
    ('MT', 'Malta', 'CFR (Commissioner for Revenue)', 'EUR', 0.18),
    ('CA', 'Canada', 'CRA (Canada Revenue Agency)', 'CAD', 0.05)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- JURISDICTION RULESETS: Tax and compliance rules per jurisdiction
-- ============================================================================

CREATE TABLE IF NOT EXISTS jurisdiction_rulesets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurisdiction_code jurisdiction_code NOT NULL REFERENCES jurisdictions(code),
    ruleset_type TEXT NOT NULL, -- 'vat', 'income_tax', 'payroll', 'audit', 'accounting'
    version TEXT NOT NULL DEFAULT '1.0.0',
    rules_json JSONB NOT NULL DEFAULT '{}',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(jurisdiction_code, ruleset_type, version)
);

-- ============================================================================
-- FIRMS: Multi-tenant firms table
-- ============================================================================

CREATE TABLE IF NOT EXISTS firms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    jurisdiction_code jurisdiction_code NOT NULL REFERENCES jurisdictions(code),
    settings_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_firms_jurisdiction ON firms(jurisdiction_code);
CREATE INDEX IF NOT EXISTS idx_firms_slug ON firms(slug);

-- ============================================================================
-- FIRM MEMBERSHIPS: Links users to firms with roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS firm_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'STAFF',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, firm_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_memberships_user ON firm_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_memberships_firm ON firm_memberships(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_memberships_role ON firm_memberships(role);

-- ============================================================================
-- CLIENTS: With financial institution blocking
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    jurisdiction jurisdiction_code NOT NULL REFERENCES jurisdictions(code),
    client_segment client_segment NOT NULL,
    entity_type TEXT, -- 'sole_proprietor', 'partnership', 'private_company', etc.
    industry_code TEXT,
    industry_description TEXT,
    
    -- CRITICAL: Financial institution blocking
    is_financial_institution BOOLEAN NOT NULL DEFAULT FALSE,
    eligibility_status TEXT NOT NULL DEFAULT 'eligible'
        CHECK (eligibility_status IN ('eligible', 'ineligible', 'pending_review')),
    
    -- Contact info
    email TEXT,
    phone TEXT,
    address_json JSONB DEFAULT '{}',
    
    -- Tax identifiers
    tax_id TEXT,
    vat_number TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- CONSTRAINT: Financial institutions are automatically ineligible
    CONSTRAINT fi_ineligible CHECK (
        (is_financial_institution = FALSE) OR 
        (is_financial_institution = TRUE AND eligibility_status = 'ineligible')
    )
);

CREATE INDEX IF NOT EXISTS idx_clients_firm ON clients(firm_id);
CREATE INDEX IF NOT EXISTS idx_clients_jurisdiction ON clients(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_clients_segment ON clients(client_segment);
CREATE INDEX IF NOT EXISTS idx_clients_eligibility ON clients(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_clients_is_fi ON clients(is_financial_institution);

-- Trigger to enforce financial institution ineligibility
CREATE OR REPLACE FUNCTION enforce_fi_ineligibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_financial_institution = TRUE THEN
        NEW.eligibility_status := 'ineligible';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_fi_ineligibility ON clients;
CREATE TRIGGER trigger_enforce_fi_ineligibility
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION enforce_fi_ineligibility();

-- ============================================================================
-- ENGAGEMENTS: Core engagement workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    
    type engagement_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'archived')),
    phase engagement_phase NOT NULL DEFAULT 'planning',
    
    -- Assignment
    manager_id UUID REFERENCES auth.users(id),
    partner_id UUID REFERENCES auth.users(id),
    
    -- Playbook reference
    playbook_id UUID,
    
    -- Materiality (for audit engagements)
    materiality_overall NUMERIC(15,2),
    materiality_performance NUMERIC(15,2),
    materiality_trivial NUMERIC(15,2),
    
    -- Dates
    target_completion_date DATE,
    actual_completion_date DATE,
    
    settings_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_period CHECK (period_start <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_engagements_client ON engagements(client_id);
CREATE INDEX IF NOT EXISTS idx_engagements_firm ON engagements(firm_id);
CREATE INDEX IF NOT EXISTS idx_engagements_type ON engagements(type);
CREATE INDEX IF NOT EXISTS idx_engagements_status ON engagements(status);
CREATE INDEX IF NOT EXISTS idx_engagements_phase ON engagements(phase);
CREATE INDEX IF NOT EXISTS idx_engagements_manager ON engagements(manager_id);

-- Trigger to prevent engagements for ineligible clients
CREATE OR REPLACE FUNCTION check_client_eligibility()
RETURNS TRIGGER AS $$
DECLARE
    client_eligible BOOLEAN;
BEGIN
    SELECT eligibility_status = 'eligible' INTO client_eligible
    FROM clients WHERE id = NEW.client_id;
    
    IF NOT client_eligible THEN
        RAISE EXCEPTION 'Cannot create engagement for ineligible client (financial institution or other exclusion)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_client_eligibility ON engagements;
CREATE TRIGGER trigger_check_client_eligibility
    BEFORE INSERT ON engagements
    FOR EACH ROW
    EXECUTE FUNCTION check_client_eligibility();

-- ============================================================================
-- TASKS: Engagement tasks from playbooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    phase engagement_phase NOT NULL,
    
    status task_status NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    
    assigned_to UUID REFERENCES auth.users(id),
    assigned_role org_role,
    
    due_date DATE,
    completed_at TIMESTAMPTZ,
    
    -- Template reference
    template_key TEXT,
    parent_task_id UUID REFERENCES tasks(id),
    
    -- Time tracking
    estimated_hours NUMERIC(6,2),
    actual_hours NUMERIC(6,2),
    
    -- Dependencies (task IDs that must complete first)
    dependencies UUID[] DEFAULT '{}',
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_engagement ON tasks(engagement_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- ============================================================================
-- DOCUMENTS: Document storage and status
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    
    doc_type TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    
    status document_status NOT NULL DEFAULT 'uploaded',
    
    -- Upload info
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Processing info
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_engagement ON documents(engagement_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);

-- ============================================================================
-- EXTRACTIONS: Extracted data from documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    extraction_type TEXT NOT NULL, -- 'table', 'text', 'form', 'ocr'
    extracted_json JSONB NOT NULL DEFAULT '{}',
    citations_json JSONB DEFAULT '[]',
    
    confidence_score NUMERIC(3,2),
    
    -- Review info
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_extractions_document ON extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_extractions_type ON extractions(extraction_type);

-- ============================================================================
-- WORKPAPERS: Engagement workpapers
-- ============================================================================

CREATE TABLE IF NOT EXISTS workpapers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    
    wp_type TEXT NOT NULL, -- 'risk_assessment', 'materiality', 'planning_memo', etc.
    wp_ref TEXT, -- Workpaper reference number (e.g., 'A-1', 'B-2.1')
    title TEXT NOT NULL,
    
    content_json JSONB NOT NULL DEFAULT '{}',
    status workpaper_status NOT NULL DEFAULT 'draft',
    
    -- Authorship
    prepared_by UUID REFERENCES auth.users(id),
    prepared_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Review chain
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    -- Version control
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES workpapers(id),
    
    -- Linked evidence
    linked_documents UUID[] DEFAULT '{}',
    linked_extractions UUID[] DEFAULT '{}',
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workpapers_engagement ON workpapers(engagement_id);
CREATE INDEX IF NOT EXISTS idx_workpapers_type ON workpapers(wp_type);
CREATE INDEX IF NOT EXISTS idx_workpapers_status ON workpapers(status);
CREATE INDEX IF NOT EXISTS idx_workpapers_ref ON workpapers(wp_ref);

-- ============================================================================
-- ISSUES: Findings, exceptions, and matters
-- ============================================================================

CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    
    issue_type TEXT NOT NULL, -- 'finding', 'exception', 'observation', 'recommendation'
    severity issue_severity NOT NULL DEFAULT 'medium',
    
    title TEXT NOT NULL,
    description TEXT,
    
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix')),
    
    -- Linkage
    workpaper_id UUID REFERENCES workpapers(id),
    task_id UUID REFERENCES tasks(id),
    
    -- Management response
    management_response TEXT,
    response_date DATE,
    
    -- Closure
    resolution TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issues_engagement ON issues(engagement_id);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- ============================================================================
-- AGENT RUNS: Agent execution traceability
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
    
    agent_type engagement_type NOT NULL,
    trace_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    status agent_run_status NOT NULL DEFAULT 'running',
    
    -- Request info
    request_message TEXT NOT NULL,
    request_context_json JSONB DEFAULT '{}',
    
    -- Response info
    response_type TEXT, -- 'text', 'workpaper', 'task_list', 'document_request'
    response_json JSONB,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    error_code TEXT,
    
    -- User who initiated
    initiated_by UUID REFERENCES auth.users(id),
    
    -- Token usage
    tokens_input INTEGER,
    tokens_output INTEGER,
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_engagement ON agent_runs(engagement_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_trace ON agent_runs(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_type ON agent_runs(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at);

-- ============================================================================
-- AGENT EVENTS: Detailed event log for agent runs
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL, -- 'tool_call', 'tool_result', 'llm_request', 'llm_response', etc.
    event_order INTEGER NOT NULL DEFAULT 0,
    
    payload_json JSONB NOT NULL DEFAULT '{}',
    
    -- Timing
    duration_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_events_run ON agent_events(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_order ON agent_events(run_id, event_order);

-- ============================================================================
-- APPROVALS: Review gates and approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    resource_type TEXT NOT NULL, -- 'workpaper', 'task', 'engagement', 'deliverable'
    resource_id UUID NOT NULL,
    
    stage TEXT NOT NULL, -- 'MANAGER', 'PARTNER', 'EQR'
    decision approval_decision NOT NULL DEFAULT 'pending',
    
    comment TEXT,
    
    -- Requestor
    requested_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Approver
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- If rejected, reason
    rejection_reason TEXT,
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approvals_resource ON approvals(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_approvals_stage ON approvals(stage);
CREATE INDEX IF NOT EXISTS idx_approvals_decision ON approvals(decision);
CREATE INDEX IF NOT EXISTS idx_approvals_approved_by ON approvals(approved_by);

-- ============================================================================
-- PLAYBOOKS: Jurisdiction and engagement type playbooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    jurisdiction jurisdiction_code NOT NULL REFERENCES jurisdictions(code),
    engagement_type engagement_type NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    
    name TEXT NOT NULL,
    description TEXT,
    
    config_json JSONB NOT NULL DEFAULT '{}',
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(jurisdiction, engagement_type, version)
);

CREATE INDEX IF NOT EXISTS idx_playbooks_jurisdiction ON playbooks(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_playbooks_type ON playbooks(engagement_type);
CREATE INDEX IF NOT EXISTS idx_playbooks_active ON playbooks(is_active);

-- ============================================================================
-- TASK TEMPLATES: Task tree templates within playbooks
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
    
    template_key TEXT NOT NULL,
    phase engagement_phase NOT NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    
    assignee_role org_role NOT NULL DEFAULT 'STAFF',
    estimated_hours NUMERIC(6,2),
    
    -- Ordering and dependencies
    sort_order INTEGER NOT NULL DEFAULT 0,
    dependencies TEXT[] DEFAULT '{}', -- template_keys
    
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(playbook_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_task_templates_playbook ON task_templates(playbook_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_phase ON task_templates(phase);

-- ============================================================================
-- DOC REQUEST TEMPLATES: Document request templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS doc_request_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
    
    doc_type TEXT NOT NULL,
    description TEXT NOT NULL,
    
    phase engagement_phase NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Matching hint for linking uploaded docs
    matching_hints TEXT[] DEFAULT '{}',
    
    metadata_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_doc_request_templates_playbook ON doc_request_templates(playbook_id);
CREATE INDEX IF NOT EXISTS idx_doc_request_templates_phase ON doc_request_templates(phase);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is member of a firm
CREATE OR REPLACE FUNCTION is_member_of_firm(p_user_id UUID, p_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM firm_memberships 
        WHERE user_id = p_user_id AND firm_id = p_firm_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's firm IDs
CREATE OR REPLACE FUNCTION get_user_firm_ids(p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT firm_id FROM firm_memberships WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user role in firm
CREATE OR REPLACE FUNCTION get_user_role_in_firm(p_user_id UUID, p_firm_id UUID)
RETURNS org_role AS $$
DECLARE
    v_role org_role;
BEGIN
    SELECT role INTO v_role FROM firm_memberships 
    WHERE user_id = p_user_id AND firm_id = p_firm_id;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eligibility check function (callable from API)
CREATE OR REPLACE FUNCTION check_client_eligibility_status(p_client_id UUID)
RETURNS TABLE(
    client_id UUID,
    eligible BOOLEAN,
    reason TEXT
) AS $$
DECLARE
    v_is_fi BOOLEAN;
    v_status TEXT;
BEGIN
    SELECT is_financial_institution, eligibility_status
    INTO v_is_fi, v_status
    FROM clients WHERE id = p_client_id;
    
    IF v_is_fi THEN
        RETURN QUERY SELECT p_client_id, FALSE, 
            'Financial institutions are not eligible for Prisma Core services'::TEXT;
    ELSIF v_status = 'ineligible' THEN
        RETURN QUERY SELECT p_client_id, FALSE, 
            'Client has been marked as ineligible'::TEXT;
    ELSIF v_status = 'pending_review' THEN
        RETURN QUERY SELECT p_client_id, FALSE, 
            'Client eligibility is pending review'::TEXT;
    ELSE
        RETURN QUERY SELECT p_client_id, TRUE, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$ 
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
        AND table_schema = 'public'
        AND table_name IN (
            'firms', 'firm_memberships', 'clients', 'engagements', 
            'tasks', 'extractions', 'workpapers', 'issues', 
            'agent_runs', 'approvals', 'playbooks', 'jurisdiction_rulesets'
        )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_update_updated_at ON %I;
            CREATE TRIGGER trigger_update_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE jurisdictions IS 'Master list of supported jurisdictions (RW, MT, CA only)';
COMMENT ON TABLE firms IS 'Multi-tenant firms/organizations';
COMMENT ON TABLE firm_memberships IS 'User-firm membership with roles';
COMMENT ON TABLE clients IS 'Client entities with financial institution blocking';
COMMENT ON TABLE engagements IS 'Engagement instances (accounting, audit, tax)';
COMMENT ON TABLE tasks IS 'Engagement tasks from playbooks';
COMMENT ON TABLE documents IS 'Uploaded documents for evidence';
COMMENT ON TABLE extractions IS 'Extracted data from documents';
COMMENT ON TABLE workpapers IS 'Engagement workpapers';
COMMENT ON TABLE issues IS 'Findings, exceptions, observations';
COMMENT ON TABLE agent_runs IS 'Agent execution traceability';
COMMENT ON TABLE agent_events IS 'Detailed event log for agent runs';
COMMENT ON TABLE approvals IS 'Review gates and approval workflow';
COMMENT ON TABLE playbooks IS 'Jurisdiction-specific engagement playbooks';
COMMENT ON TABLE task_templates IS 'Task templates within playbooks';
COMMENT ON TABLE doc_request_templates IS 'Document request templates';

COMMENT ON COLUMN clients.is_financial_institution IS 'CRITICAL: Set to TRUE to block engagement creation';
COMMENT ON COLUMN clients.eligibility_status IS 'Client eligibility: eligible, ineligible, pending_review';

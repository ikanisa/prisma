-- ============================================================================
-- Malta Audit Schema Extension
-- Migration: 20260110100000_malta_audit_schema.sql
-- 
-- Adds tables for Malta audit engagements, HITL gates, and audit trails.
-- Supports Big 4-level ISA-compliant autonomous audit system.
-- ============================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Engagement type per LN 139/2025
DO $$ BEGIN
    CREATE TYPE malta_engagement_type AS ENUM (
        'FULL_AUDIT',
        'ISRE_2400_REVIEW',
        'NO_ASSURANCE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Exemption rule applied
DO $$ BEGIN
    CREATE TYPE malta_exemption_rule AS ENUM (
        'RULE_6_NEW_COMPANY',
        'RULE_7_MICRO_ENTITY',
        'RULE_8_SMALL_GROUP',
        'RULE_9_MERCHANT_SHIPPING',
        'NONE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Engagement status
DO $$ BEGIN
    CREATE TYPE malta_engagement_status AS ENUM (
        'PLANNING',
        'FIELDWORK',
        'COMPLETION',
        'REVIEW',
        'REPORTING',
        'SIGNED_OFF',
        'ARCHIVED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Opinion type per ISA 700
DO $$ BEGIN
    CREATE TYPE malta_opinion_type AS ENUM (
        'UNMODIFIED',
        'QUALIFIED',
        'ADVERSE',
        'DISCLAIMER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- HITL gate decision
DO $$ BEGIN
    CREATE TYPE hitl_decision AS ENUM (
        'PENDING',
        'APPROVED',
        'REJECTED',
        'ESCALATED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- MALTA AUDIT ENGAGEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_audit_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Company reference
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE RESTRICT,
    company_registration_no TEXT NOT NULL,
    
    -- Engagement details
    engagement_type malta_engagement_type NOT NULL,
    exemption_rule malta_exemption_rule NOT NULL DEFAULT 'NONE',
    routing_decision JSONB,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Materiality
    overall_materiality NUMERIC(15,2),
    performance_materiality NUMERIC(15,2),
    trivial_threshold NUMERIC(15,2),
    materiality_benchmark TEXT,
    materiality_percentage NUMERIC(5,2),
    
    -- Risk assessment
    overall_risk_level TEXT CHECK (overall_risk_level IN ('LOW', 'MODERATE', 'HIGH')),
    significant_risks JSONB,
    
    -- Status
    status malta_engagement_status NOT NULL DEFAULT 'PLANNING',
    
    -- Team
    partner_id UUID,
    partner_warrant_no TEXT,
    manager_id UUID,
    eqcr_required BOOLEAN DEFAULT FALSE,
    eqcr_reviewer_id UUID,
    eqcr_completed BOOLEAN DEFAULT FALSE,
    eqcr_date TIMESTAMPTZ,
    
    -- Opinion
    opinion_type malta_opinion_type,
    opinion_date DATE,
    key_audit_matters JSONB,
    emphasis_of_matter TEXT[],
    
    -- Going concern
    going_concern_issue BOOLEAN DEFAULT FALSE,
    going_concern_assessment JSONB,
    
    -- MBR filing
    mbr_reference_number TEXT,
    mbr_filing_date DATE,
    
    -- Timing
    planning_start_date DATE,
    fieldwork_start_date DATE,
    fieldwork_end_date DATE,
    report_date DATE,
    archive_date DATE,
    
    -- Retention (7 years per Companies Act)
    retention_expiry DATE,
    archived BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID,
    
    CONSTRAINT valid_period CHECK (period_end > period_start),
    CONSTRAINT valid_materiality CHECK (performance_materiality IS NULL OR performance_materiality <= overall_materiality)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_audit_engagement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_malta_audit_engagements_updated_at
    BEFORE UPDATE ON malta_audit_engagements
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_engagement_updated_at();

-- Indices
CREATE INDEX IF NOT EXISTS idx_malta_audit_engagements_company 
    ON malta_audit_engagements(company_id);
CREATE INDEX IF NOT EXISTS idx_malta_audit_engagements_status 
    ON malta_audit_engagements(status);
CREATE INDEX IF NOT EXISTS idx_malta_audit_engagements_period 
    ON malta_audit_engagements(period_end);
CREATE INDEX IF NOT EXISTS idx_malta_audit_engagements_partner 
    ON malta_audit_engagements(partner_id);

-- ============================================================================
-- HITL GATE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_audit_hitl_gates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    engagement_id UUID NOT NULL REFERENCES malta_audit_engagements(id) ON DELETE CASCADE,
    
    -- Gate details
    gate_id TEXT NOT NULL,
    gate_name TEXT NOT NULL,
    
    -- Trigger
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    triggered_by UUID,
    triggered_by_agent TEXT,
    trigger_reason TEXT NOT NULL,
    trigger_context JSONB,
    
    -- Required reviewer
    required_reviewer TEXT NOT NULL,
    timeout_hours INTEGER NOT NULL DEFAULT 48,
    
    -- Decision
    decision hitl_decision NOT NULL DEFAULT 'PENDING',
    reviewer_id UUID,
    reviewer_name TEXT,
    decision_date TIMESTAMPTZ,
    rationale TEXT,
    conditions TEXT[],
    
    -- Escalation
    escalated BOOLEAN DEFAULT FALSE,
    escalation_date TIMESTAMPTZ,
    escalation_path TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger for updated_at
CREATE TRIGGER trigger_update_malta_audit_hitl_gates_updated_at
    BEFORE UPDATE ON malta_audit_hitl_gates
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_engagement_updated_at();

-- Indices
CREATE INDEX IF NOT EXISTS idx_malta_audit_hitl_gates_engagement 
    ON malta_audit_hitl_gates(engagement_id);
CREATE INDEX IF NOT EXISTS idx_malta_audit_hitl_gates_pending 
    ON malta_audit_hitl_gates(engagement_id, decision) 
    WHERE decision = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_malta_audit_hitl_gates_gate_id 
    ON malta_audit_hitl_gates(gate_id);

-- ============================================================================
-- AUDIT TRAIL (IMMUTABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    engagement_id UUID REFERENCES malta_audit_engagements(id) ON DELETE SET NULL,
    
    -- Action
    agent_id TEXT NOT NULL,
    agent_name TEXT,
    action TEXT NOT NULL,
    action_type TEXT NOT NULL,
    
    -- Data integrity
    input_hash TEXT,
    output_hash TEXT,
    
    -- Context
    context JSONB,
    result_summary TEXT,
    
    -- Audit metadata
    user_id UUID,
    ip_address INET,
    session_id TEXT,
    
    -- Timestamp (immutable)
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent updates/deletes
    CONSTRAINT audit_trail_immutable CHECK (TRUE)
);

-- Index for querying
CREATE INDEX IF NOT EXISTS idx_malta_audit_trail_engagement 
    ON malta_audit_trail(engagement_id);
CREATE INDEX IF NOT EXISTS idx_malta_audit_trail_agent 
    ON malta_audit_trail(agent_id);
CREATE INDEX IF NOT EXISTS idx_malta_audit_trail_timestamp 
    ON malta_audit_trail(timestamp);
CREATE INDEX IF NOT EXISTS idx_malta_audit_trail_action_type 
    ON malta_audit_trail(action_type);

-- Prevent updates and deletes on audit trail
CREATE OR REPLACE FUNCTION prevent_audit_trail_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit trail is immutable - modifications not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_trail_update
    BEFORE UPDATE ON malta_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_trail_modification();

CREATE TRIGGER trigger_prevent_audit_trail_delete
    BEFORE DELETE ON malta_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_trail_modification();

-- ============================================================================
-- RISK ASSESSMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_audit_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    engagement_id UUID NOT NULL REFERENCES malta_audit_engagements(id) ON DELETE CASCADE,
    
    -- Assessment
    account_or_assertion TEXT NOT NULL,
    assertion_level TEXT[],
    inherent_risk TEXT NOT NULL CHECK (inherent_risk IN ('low', 'moderate', 'significant', 'high')),
    control_risk TEXT NOT NULL CHECK (control_risk IN ('low', 'moderate', 'significant', 'high')),
    combined_risk TEXT NOT NULL CHECK (combined_risk IN ('low', 'moderate', 'significant', 'high')),
    
    -- Flags
    is_significant_risk BOOLEAN NOT NULL DEFAULT FALSE,
    is_fraud_risk BOOLEAN NOT NULL DEFAULT FALSE,
    blockchain_verification_required BOOLEAN DEFAULT FALSE,
    
    -- Details
    rationale TEXT NOT NULL,
    response_required TEXT[],
    malta_risk_indicators TEXT[],
    mfsa_requirements TEXT[],
    
    -- Metadata
    assessed_by UUID,
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_malta_audit_risk_assessments_engagement 
    ON malta_audit_risk_assessments(engagement_id);
CREATE INDEX IF NOT EXISTS idx_malta_audit_risk_assessments_significant 
    ON malta_audit_risk_assessments(engagement_id, is_significant_risk) 
    WHERE is_significant_risk = TRUE;

-- ============================================================================
-- SUBSTANTIVE TEST RESULTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_audit_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    engagement_id UUID NOT NULL REFERENCES malta_audit_engagements(id) ON DELETE CASCADE,
    risk_assessment_id UUID REFERENCES malta_audit_risk_assessments(id),
    
    -- Test details
    procedure_id TEXT NOT NULL,
    procedure_type TEXT NOT NULL CHECK (procedure_type IN (
        'vouching', 'confirmation', 'recalculation', 'analytical', 'cutoff', 'test_of_controls'
    )),
    account TEXT NOT NULL,
    assertion TEXT NOT NULL,
    
    -- Sample
    population_size INTEGER,
    population_value NUMERIC(15,2),
    sample_size INTEGER NOT NULL,
    sample_value NUMERIC(15,2),
    sampling_method TEXT,
    
    -- Results
    items_tested INTEGER NOT NULL,
    exceptions_found INTEGER NOT NULL DEFAULT 0,
    exceptions JSONB,
    misstatement_amount NUMERIC(15,2),
    
    -- Coverage
    coverage_percentage NUMERIC(5,2),
    
    -- Conclusion
    conclusion TEXT NOT NULL,
    further_procedures_required BOOLEAN DEFAULT FALSE,
    
    -- Performer
    performed_by UUID,
    performed_at TIMESTAMPTZ,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_malta_audit_test_results_engagement 
    ON malta_audit_test_results(engagement_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE malta_audit_engagements IS 'Malta audit engagement tracking with ISA compliance';
COMMENT ON TABLE malta_audit_hitl_gates IS 'Human-in-the-Loop gate decisions for quality control';
COMMENT ON TABLE malta_audit_trail IS 'Immutable audit trail for all agent actions (7-year retention)';
COMMENT ON TABLE malta_audit_risk_assessments IS 'ISA 315 risk assessments per engagement';
COMMENT ON TABLE malta_audit_test_results IS 'ISA 330/500/530 substantive test results';

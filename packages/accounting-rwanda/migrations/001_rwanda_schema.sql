-- Rwanda Accounting System - Database Schema
-- Supabase Migration
-- 
-- Creates tables for:
-- - IFRS-compliant chart of accounts
-- - Transactions with IFRS compliance tracking
-- - RSSB contributions
-- - VAT reconciliation
-- - Tax calculations and returns
-- - Audit engagements and procedures
-- - Anomaly tracking
-- - Knowledge base (embeddings)
--
-- @package @prisma/accounting-rwanda

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

-- Enable pgvector for knowledge base embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- ENTITY TYPES
-- ============================================================================

-- Entity classification types
CREATE TYPE rwanda_entity_type AS ENUM (
    'PIE',
    'LISTED',
    'BANK',
    'INSURANCE',
    'LARGE_PRIVATE',
    'SME',
    'SMALL_PRIVATE',
    'PUBLIC_SECTOR'
);

-- Accounting framework types
CREATE TYPE rwanda_accounting_framework AS ENUM (
    'FULL_IFRS',
    'IFRS_FOR_SMES',
    'IPSAS'
);

-- Audit tier types
CREATE TYPE audit_tier AS ENUM (
    'TIER_I',
    'TIER_II',
    'TIER_III'
);

-- VAT category types
CREATE TYPE vat_category AS ENUM (
    'STANDARD',
    'ZERO_RATED',
    'EXEMPT',
    'OUT_OF_SCOPE'
);

-- Tax return status
CREATE TYPE tax_return_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'ACCEPTED',
    'REJECTED',
    'PAID'
);

-- Risk level types
CREATE TYPE risk_level AS ENUM (
    'LOW',
    'NORMAL',
    'SIGNIFICANT',
    'HIGH'
);

-- Anomaly severity
CREATE TYPE anomaly_severity AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- ============================================================================
-- ENTITIES (CLIENTS)
-- ============================================================================

CREATE TABLE rwanda_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tin TEXT NOT NULL UNIQUE,
    
    -- Classification
    entity_type rwanda_entity_type NOT NULL,
    accounting_framework rwanda_accounting_framework NOT NULL DEFAULT 'FULL_IFRS',
    audit_tier audit_tier,
    
    -- Thresholds
    annual_turnover DECIMAL(18,2),
    total_assets DECIMAL(18,2),
    employee_count INTEGER,
    
    -- Regulatory
    is_pie BOOLEAN DEFAULT FALSE,
    is_vat_registered BOOLEAN DEFAULT FALSE,
    vat_registration_date DATE,
    ebm_serial_number TEXT,
    bnr_regulated BOOLEAN DEFAULT FALSE,
    requires_kam BOOLEAN DEFAULT FALSE,
    
    -- Fiscal year
    fiscal_year_end_month INTEGER DEFAULT 12,
    fiscal_year_end_day INTEGER DEFAULT 31,
    
    -- Listed company info
    is_listed BOOLEAN DEFAULT FALSE,
    years_listed INTEGER,
    public_shareholding_percent DECIMAL(5,2),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on TIN for lookups
CREATE INDEX idx_rwanda_entities_tin ON rwanda_entities(tin);

-- ============================================================================
-- CHART OF ACCOUNTS
-- ============================================================================

CREATE TABLE rwanda_chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    
    -- IFRS compliance
    ifrs_category TEXT NOT NULL,
    ifrs_standard TEXT,
    
    -- Parent for hierarchy
    parent_id UUID REFERENCES rwanda_chart_of_accounts(id),
    
    -- Tax treatment
    tax_treatment vat_category DEFAULT 'NOT_APPLICABLE',
    
    -- Currency
    currency TEXT DEFAULT 'RWF',
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, code)
);

-- Indexes
CREATE INDEX idx_rwanda_coa_entity ON rwanda_chart_of_accounts(entity_id);
CREATE INDEX idx_rwanda_coa_code ON rwanda_chart_of_accounts(code);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================

CREATE TABLE rwanda_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    -- Transaction details
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    currency TEXT DEFAULT 'RWF',
    exchange_rate DECIMAL(12,6) DEFAULT 1,
    amount_rwf DECIMAL(18,2) NOT NULL,
    
    -- Account
    account_id UUID REFERENCES rwanda_chart_of_accounts(id),
    debit_credit TEXT NOT NULL CHECK (debit_credit IN ('DEBIT', 'CREDIT')),
    
    -- IFRS compliance
    ifrs_standard TEXT,
    recognition_date DATE,
    measurement_basis TEXT CHECK (measurement_basis IN ('HISTORICAL_COST', 'FAIR_VALUE', 'PRESENT_VALUE', 'AMORTIZED_COST')),
    
    -- VAT
    vat_category vat_category,
    vat_rate DECIMAL(5,2),
    vat_amount DECIMAL(18,2),
    
    -- EBM
    ebm_invoice_number TEXT,
    
    -- Trade and counterparty
    counterparty_name TEXT,
    counterparty_tin TEXT,
    is_export BOOLEAN DEFAULT FALSE,
    is_eac_supply BOOLEAN DEFAULT FALSE,
    is_afcfta_supply BOOLEAN DEFAULT FALSE,
    origin_certificate_ref TEXT,
    
    -- RSSB related
    is_rssb_related BOOLEAN DEFAULT FALSE,
    
    -- Journal entry reference
    journal_entry_id UUID,
    
    -- AI categorization
    ai_categorized BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(5,4),
    ai_ifrs_standard TEXT,
    human_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rwanda_tx_entity ON rwanda_transactions(entity_id);
CREATE INDEX idx_rwanda_tx_date ON rwanda_transactions(date);
CREATE INDEX idx_rwanda_tx_account ON rwanda_transactions(account_id);
CREATE INDEX idx_rwanda_tx_ebm ON rwanda_transactions(ebm_invoice_number);

-- ============================================================================
-- JOURNAL ENTRIES
-- ============================================================================

CREATE TABLE rwanda_journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    
    -- IFRS
    ifrs_standard TEXT,
    measurement_basis TEXT,
    
    -- VAT summary
    vat_amount DECIMAL(18,2),
    vat_rate DECIMAL(5,2),
    
    -- Totals
    total_debits DECIMAL(18,2) NOT NULL,
    total_credits DECIMAL(18,2) NOT NULL,
    is_balanced BOOLEAN GENERATED ALWAYS AS (total_debits = total_credits) STORED,
    
    -- AI processing
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_confidence DECIMAL(5,4),
    requires_review BOOLEAN DEFAULT FALSE,
    review_reason TEXT,
    
    -- Status
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
    posted_at TIMESTAMPTZ,
    posted_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entry lines
CREATE TABLE rwanda_journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES rwanda_journal_entries(id) ON DELETE CASCADE,
    
    account_id UUID NOT NULL REFERENCES rwanda_chart_of_accounts(id),
    account_code TEXT NOT NULL,
    account_name TEXT NOT NULL,
    
    debit DECIMAL(18,2),
    credit DECIMAL(18,2),
    description TEXT,
    
    line_order INTEGER NOT NULL,
    
    CHECK ((debit IS NOT NULL AND credit IS NULL) OR (credit IS NOT NULL AND debit IS NULL))
);

-- ============================================================================
-- RSSB CONTRIBUTIONS
-- ============================================================================

CREATE TABLE rwanda_rssb_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    period_month DATE NOT NULL,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    
    gross_salary DECIMAL(18,2) NOT NULL,
    
    -- Pension (12% in 2026: 6% employer + 6% employee)
    pension_employer DECIMAL(18,2) NOT NULL,
    pension_employee DECIMAL(18,2) NOT NULL,
    
    -- Other contributions
    occupational_hazard DECIMAL(18,2) NOT NULL,  -- 2%
    maternity_benefit DECIMAL(18,2) NOT NULL,     -- 0.3%
    
    -- Totals
    total_employer DECIMAL(18,2) NOT NULL,
    total_employee DECIMAL(18,2) NOT NULL,
    
    -- PAYE
    paye_tax DECIMAL(18,2),
    net_salary DECIMAL(18,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, period_month, employee_id)
);

-- RSSB period summary
CREATE TABLE rwanda_rssb_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    period_month DATE NOT NULL,
    
    -- Summary
    employee_count INTEGER NOT NULL,
    total_gross_salary DECIMAL(18,2) NOT NULL,
    total_pension_employer DECIMAL(18,2) NOT NULL,
    total_pension_employee DECIMAL(18,2) NOT NULL,
    total_occupational_hazard DECIMAL(18,2) NOT NULL,
    total_maternity_benefit DECIMAL(18,2) NOT NULL,
    grand_total_payable DECIMAL(18,2) NOT NULL,
    
    -- Payment
    due_date DATE NOT NULL,
    payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'OVERDUE')),
    paid_date DATE,
    payment_reference TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, period_month)
);

-- ============================================================================
-- VAT RETURNS
-- ============================================================================

CREATE TABLE rwanda_vat_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('MONTHLY', 'QUARTERLY')),
    
    -- VAT boxes
    box1_standard_rated_supplies DECIMAL(18,2) NOT NULL,
    box1_output_vat DECIMAL(18,2) NOT NULL,
    box2_zero_rated_supplies DECIMAL(18,2) NOT NULL,
    box3_exempt_supplies DECIMAL(18,2) NOT NULL,
    box4_total_supplies DECIMAL(18,2) NOT NULL,
    box5_input_vat DECIMAL(18,2) NOT NULL,
    box6_net_vat DECIMAL(18,2) NOT NULL,
    box7_amount DECIMAL(18,2) NOT NULL,
    box7_type TEXT NOT NULL CHECK (box7_type IN ('PAYABLE', 'REFUNDABLE')),
    
    -- EBM
    ebm_invoice_count INTEGER DEFAULT 0,
    
    -- ISHEMA submission
    status tax_return_status DEFAULT 'DRAFT',
    ishema_reference TEXT,
    submitted_at TIMESTAMPTZ,
    
    -- AI processing
    ai_prepared BOOLEAN DEFAULT FALSE,
    requires_review BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, period_start, period_end)
);

-- ============================================================================
-- CIT RETURNS
-- ============================================================================

CREATE TABLE rwanda_cit_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    financial_year_end DATE NOT NULL,
    
    -- Profit calculation
    accounting_profit DECIMAL(18,2) NOT NULL,
    tax_adjustments_add_backs DECIMAL(18,2) NOT NULL,
    tax_adjustments_deductions DECIMAL(18,2) NOT NULL,
    taxable_income DECIMAL(18,2) NOT NULL,
    
    -- Tax calculation
    cit_rate DECIMAL(5,4) NOT NULL,
    cit_payable DECIMAL(18,2) NOT NULL,
    provisional_payments DECIMAL(18,2) DEFAULT 0,
    balance_payable DECIMAL(18,2) NOT NULL,
    
    -- Effective rate
    effective_tax_rate DECIMAL(5,4),
    
    -- Loss carry forward
    prior_year_losses_used DECIMAL(18,2) DEFAULT 0,
    losses_carried_forward DECIMAL(18,2) DEFAULT 0,
    
    -- ISHEMA submission
    status tax_return_status DEFAULT 'DRAFT',
    ishema_reference TEXT,
    submitted_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, financial_year_end)
);

-- CIT adjustments detail
CREATE TABLE rwanda_cit_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cit_return_id UUID NOT NULL REFERENCES rwanda_cit_returns(id) ON DELETE CASCADE,
    
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('ADD_BACK', 'DEDUCTION')),
    item TEXT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    reference TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT ENGAGEMENTS
-- ============================================================================

CREATE TABLE rwanda_audit_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    financial_year_end DATE NOT NULL,
    engagement_partner_id UUID,
    
    -- Classification
    tier_required audit_tier NOT NULL,
    is_pie BOOLEAN DEFAULT FALSE,
    requires_kam BOOLEAN DEFAULT FALSE,
    
    -- Materiality
    overall_materiality DECIMAL(18,2),
    performance_materiality DECIMAL(18,2),
    clearly_trivial DECIMAL(18,2),
    materiality_base TEXT,
    materiality_percentage DECIMAL(5,4),
    
    -- Risk assessment
    overall_risk_level risk_level DEFAULT 'NORMAL',
    
    -- Status
    status TEXT DEFAULT 'PLANNING' CHECK (status IN ('PLANNING', 'FIELDWORK', 'REVIEW', 'REPORTING', 'COMPLETE')),
    
    -- Dates
    planning_start DATE,
    fieldwork_start DATE,
    reporting_date DATE,
    completion_date DATE,
    
    -- Going concern
    going_concern_doubt BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(entity_id, financial_year_end)
);

-- Audit risks (ISA 315)
CREATE TABLE rwanda_audit_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES rwanda_audit_engagements(id) ON DELETE CASCADE,
    
    risk_area TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Risk levels
    inherent_risk risk_level NOT NULL,
    control_risk risk_level NOT NULL,
    detection_risk risk_level NOT NULL,
    overall_risk risk_level NOT NULL,
    
    -- ISA reference
    isa_standard TEXT NOT NULL,
    
    -- Rwanda-specific
    is_rwanda_specific BOOLEAN DEFAULT FALSE,
    rra_compliance_risk BOOLEAN DEFAULT FALSE,
    bnr_compliance_risk BOOLEAN DEFAULT FALSE,
    
    -- Response
    audit_response TEXT,
    responsible_auditor_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key Audit Matters (ISA 701)
CREATE TABLE rwanda_key_audit_matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID NOT NULL REFERENCES rwanda_audit_engagements(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    why_kam TEXT NOT NULL,
    how_addressed TEXT NOT NULL,
    
    ifrs_reference TEXT,
    isa_reference TEXT,
    
    audit_effort_hours DECIMAL(8,2),
    management_judgment_level TEXT CHECK (management_judgment_level IN ('LOW', 'MEDIUM', 'HIGH')),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ANOMALIES
-- ============================================================================

CREATE TABLE rwanda_audit_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id UUID REFERENCES rwanda_audit_engagements(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('POINT', 'CONTEXTUAL', 'COLLECTIVE', 'RWANDA_SPECIFIC')),
    severity anomaly_severity NOT NULL,
    
    transaction_id UUID REFERENCES rwanda_transactions(id),
    
    description TEXT NOT NULL,
    isa_reference TEXT,
    rra_implication TEXT,
    
    -- AI detection
    detected_by_ai BOOLEAN DEFAULT TRUE,
    ai_confidence DECIMAL(5,4),
    
    -- Investigation
    investigated BOOLEAN DEFAULT FALSE,
    investigation_notes TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolution TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for anomaly lookups
CREATE INDEX idx_rwanda_anomalies_entity ON rwanda_audit_anomalies(entity_id);
CREATE INDEX idx_rwanda_anomalies_engagement ON rwanda_audit_anomalies(engagement_id);
CREATE INDEX idx_rwanda_anomalies_severity ON rwanda_audit_anomalies(severity);

-- ============================================================================
-- KNOWLEDGE BASE (RAG)
-- ============================================================================

-- Document sources
CREATE TABLE rwanda_kb_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    source_type TEXT NOT NULL CHECK (source_type IN (
        'IFRS_STANDARD',
        'ISA_STANDARD',
        'RRA_TAX_CODE',
        'ICPAR_CIRCULAR',
        'BNR_DIRECTIVE',
        'EAC_REGULATION',
        'AFCFTA_RULE',
        'INTERNAL_POLICY'
    )),
    
    title TEXT NOT NULL,
    version TEXT,
    effective_date DATE,
    
    -- Content
    full_text TEXT NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks with embeddings
CREATE TABLE rwanda_kb_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES rwanda_kb_documents(id) ON DELETE CASCADE,
    
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    
    -- Embedding (1536 dimensions for text-embedding-3-small)
    embedding vector(1536),
    
    -- Token count
    token_count INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(document_id, chunk_index)
);

-- Index for similarity search
CREATE INDEX idx_rwanda_kb_chunks_embedding ON rwanda_kb_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TAX COMPLIANCE ISSUES
-- ============================================================================

CREATE TABLE rwanda_tax_compliance_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES rwanda_entities(id) ON DELETE CASCADE,
    
    issue_type TEXT NOT NULL,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('VAT', 'CIT', 'PAYE', 'RSSB', 'WHT', 'DST')),
    severity anomaly_severity NOT NULL,
    
    description TEXT NOT NULL,
    rra_risk TEXT,
    potential_penalty DECIMAL(18,2),
    
    -- Detection
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    detected_by_ai BOOLEAN DEFAULT TRUE,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_rwanda_entities_timestamp
    BEFORE UPDATE ON rwanda_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rwanda_transactions_timestamp
    BEFORE UPDATE ON rwanda_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rwanda_audit_engagements_timestamp
    BEFORE UPDATE ON rwanda_audit_engagements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE rwanda_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwanda_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwanda_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwanda_vat_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwanda_cit_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwanda_rssb_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rwanda_audit_engagements ENABLE ROW LEVEL SECURITY;

-- Policies will be added based on auth requirements
-- Example policy for entities (modify based on your auth model):
-- CREATE POLICY "Users can view their firm entities"
--     ON rwanda_entities FOR SELECT
--     USING (auth.uid() IN (
--         SELECT user_id FROM firm_users WHERE firm_id = rwanda_entities.firm_id
--     ));

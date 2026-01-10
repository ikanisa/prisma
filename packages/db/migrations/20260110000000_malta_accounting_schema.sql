-- ============================================================================
-- Malta Accounting Schema Extension
-- Migration: 20260110000000_malta_accounting_schema.sql
-- 
-- Adds tables for Malta accounting entities including companies, accounts,
-- journal entries, and financial statements.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Malta entity classification
DO $$ BEGIN
    CREATE TYPE malta_entity_classification AS ENUM (
        'MICRO',
        'SMALL',
        'MEDIUM',
        'LARGE',
        'PUBLIC_INTEREST'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Accounting framework
DO $$ BEGIN
    CREATE TYPE accounting_framework AS ENUM (
        'GAPSME',
        'IFRS'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Account type
DO $$ BEGIN
    CREATE TYPE account_type AS ENUM (
        'ASSET',
        'LIABILITY',
        'EQUITY',
        'REVENUE',
        'EXPENSE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Transaction type
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'JOURNAL',
        'INVOICE',
        'PAYMENT',
        'RECEIPT',
        'BANK_TRANSACTION',
        'ADJUSTING',
        'CLOSING',
        'REVERSING',
        'DEPRECIATION',
        'REVALUATION'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- MALTA COMPANIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
    registration_number TEXT UNIQUE NOT NULL,  -- Malta company number (C-XXXXX)
    name TEXT NOT NULL,
    trading_name TEXT,
    vat_number TEXT,
    tin TEXT,  -- Tax Identification Number
    incorporation_date DATE NOT NULL,
    year_end_month INTEGER NOT NULL CHECK (year_end_month BETWEEN 1 AND 12),
    year_end_day INTEGER NOT NULL CHECK (year_end_day BETWEEN 1 AND 31),
    currency TEXT NOT NULL DEFAULT 'EUR',
    classification malta_entity_classification NOT NULL DEFAULT 'MICRO',
    accounting_framework accounting_framework NOT NULL DEFAULT 'GAPSME',
    is_regulated BOOLEAN NOT NULL DEFAULT FALSE,
    regulated_by TEXT,
    audit_required BOOLEAN NOT NULL DEFAULT TRUE,
    audit_exemption_reason TEXT,
    registered_office TEXT,
    company_secretary TEXT,
    authorized_share_capital DECIMAL(15,2) NOT NULL DEFAULT 1200,
    issued_share_capital DECIMAL(15,2) NOT NULL DEFAULT 1200,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_registration_number CHECK (registration_number ~ '^C\s*\d+$')
);

-- Trigger for updated_at
CREATE TRIGGER trigger_update_malta_companies_updated_at
    BEFORE UPDATE ON malta_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for firm lookup
CREATE INDEX IF NOT EXISTS idx_malta_companies_firm 
    ON malta_companies(firm_id);

-- Index for classification queries
CREATE INDEX IF NOT EXISTS idx_malta_companies_classification 
    ON malta_companies(classification);

-- ============================================================================
-- MALTA ACCOUNTS (Chart of Accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_type account_type NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    gapsme_mapping TEXT NOT NULL,
    ifrs_mapping TEXT NOT NULL,
    debit_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    parent_account_id UUID REFERENCES malta_accounts(id),
    normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(company_id, account_number)
);

-- Trigger for updated_at
CREATE TRIGGER trigger_update_malta_accounts_updated_at
    BEFORE UPDATE ON malta_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for account lookups
CREATE INDEX IF NOT EXISTS idx_malta_accounts_company 
    ON malta_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_malta_accounts_type 
    ON malta_accounts(company_id, account_type);
CREATE INDEX IF NOT EXISTS idx_malta_accounts_number 
    ON malta_accounts(company_id, account_number);

-- ============================================================================
-- MALTA JOURNAL ENTRIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    reference TEXT NOT NULL,
    narrative TEXT NOT NULL,
    transaction_type transaction_type NOT NULL,
    
    -- Debit side
    debit_account TEXT NOT NULL,
    debit_amount DECIMAL(15,2) NOT NULL CHECK (debit_amount >= 0),
    debit_description TEXT,
    
    -- Credit side
    credit_account TEXT NOT NULL,
    credit_amount DECIMAL(15,2) NOT NULL CHECK (credit_amount >= 0),
    credit_description TEXT,
    
    -- AI metadata
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    review_status TEXT CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    review_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    
    -- Audit trail
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Validation
    CONSTRAINT balanced_entry CHECK (debit_amount = credit_amount),
    CONSTRAINT different_accounts CHECK (debit_account != credit_account)
);

-- Trigger for updated_at
CREATE TRIGGER trigger_update_malta_journal_entries_updated_at
    BEFORE UPDATE ON malta_journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indices for journal entry queries
CREATE INDEX IF NOT EXISTS idx_malta_journal_entries_company 
    ON malta_journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_malta_journal_entries_date 
    ON malta_journal_entries(company_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_malta_journal_entries_review 
    ON malta_journal_entries(company_id, review_status) 
    WHERE review_required = TRUE;

-- ============================================================================
-- MALTA FIXED ASSETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_fixed_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE CASCADE,
    asset_name TEXT NOT NULL,
    asset_class TEXT NOT NULL,
    acquisition_date DATE NOT NULL,
    cost DECIMAL(15,2) NOT NULL CHECK (cost > 0),
    residual_value DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (residual_value >= 0),
    useful_life_years INTEGER NOT NULL CHECK (useful_life_years > 0),
    depreciation_method TEXT NOT NULL CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION')),
    accumulated_depreciation DECIMAL(15,2) NOT NULL DEFAULT 0,
    depreciation_expense_account TEXT NOT NULL,
    accumulated_depreciation_account TEXT NOT NULL,
    is_disposed BOOLEAN NOT NULL DEFAULT FALSE,
    disposal_date DATE,
    disposal_proceeds DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_residual CHECK (residual_value <= cost),
    CONSTRAINT valid_disposal CHECK (
        (is_disposed = FALSE AND disposal_date IS NULL) OR
        (is_disposed = TRUE AND disposal_date IS NOT NULL)
    )
);

-- Trigger for updated_at
CREATE TRIGGER trigger_update_malta_fixed_assets_updated_at
    BEFORE UPDATE ON malta_fixed_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for asset queries
CREATE INDEX IF NOT EXISTS idx_malta_fixed_assets_company 
    ON malta_fixed_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_malta_fixed_assets_class 
    ON malta_fixed_assets(company_id, asset_class);

-- ============================================================================
-- MALTA FINANCIAL STATEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_financial_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    framework accounting_framework NOT NULL,
    
    -- Statement content (JSON)
    balance_sheet JSONB NOT NULL,
    income_statement JSONB NOT NULL,
    cash_flow_statement JSONB,
    equity_changes_statement JSONB,
    notes JSONB,
    
    -- Filing status
    directors_report TEXT,
    auditors_report TEXT,
    audit_exemption_declaration TEXT,
    
    -- MBR filing
    filed BOOLEAN NOT NULL DEFAULT FALSE,
    filed_at TIMESTAMPTZ,
    mbr_confirmation TEXT,
    
    -- Metadata
    generated_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- Trigger for updated_at
CREATE TRIGGER trigger_update_malta_financial_statements_updated_at
    BEFORE UPDATE ON malta_financial_statements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index for statement queries
CREATE INDEX IF NOT EXISTS idx_malta_financial_statements_company 
    ON malta_financial_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_malta_financial_statements_period 
    ON malta_financial_statements(company_id, period_end);

-- ============================================================================
-- MALTA DIRECTORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_directors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    id_number TEXT NOT NULL,
    nationality TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    residential_address TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    resignation_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_resignation CHECK (
        resignation_date IS NULL OR resignation_date >= appointment_date
    )
);

-- Index for director queries
CREATE INDEX IF NOT EXISTS idx_malta_directors_company 
    ON malta_directors(company_id);
CREATE INDEX IF NOT EXISTS idx_malta_directors_active 
    ON malta_directors(company_id, is_active);

-- ============================================================================
-- MALTA SHAREHOLDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_shareholders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    shareholder_type TEXT NOT NULL CHECK (shareholder_type IN ('INDIVIDUAL', 'CORPORATE')),
    id_or_reg_number TEXT NOT NULL,
    address TEXT NOT NULL,
    shares_held INTEGER NOT NULL CHECK (shares_held > 0),
    share_class TEXT NOT NULL DEFAULT 'ORDINARY',
    percentage_ownership DECIMAL(5,2) NOT NULL CHECK (percentage_ownership BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for shareholder queries
CREATE INDEX IF NOT EXISTS idx_malta_shareholders_company 
    ON malta_shareholders(company_id);

-- ============================================================================
-- YEAR METRICS (for classification tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS malta_year_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES malta_companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 2000),
    total_assets DECIMAL(15,2) NOT NULL,
    turnover DECIMAL(15,2) NOT NULL,
    average_employees INTEGER NOT NULL CHECK (average_employees >= 0),
    classification malta_entity_classification NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(company_id, year)
);

-- Index for metrics queries
CREATE INDEX IF NOT EXISTS idx_malta_year_metrics_company 
    ON malta_year_metrics(company_id, year);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE malta_companies IS 'Malta registered companies with accounting configuration';
COMMENT ON TABLE malta_accounts IS 'Chart of Accounts for Malta companies with GAPSME/IFRS mappings';
COMMENT ON TABLE malta_journal_entries IS 'Journal entries with AI generation metadata';
COMMENT ON TABLE malta_fixed_assets IS 'Fixed asset register for depreciation calculations';
COMMENT ON TABLE malta_financial_statements IS 'Generated financial statements for MBR filing';
COMMENT ON TABLE malta_directors IS 'Company director information for MBR annual return';
COMMENT ON TABLE malta_shareholders IS 'Shareholder register for annual return';
COMMENT ON TABLE malta_year_metrics IS 'Historical metrics for entity classification tracking';

-- ============================================
-- AGENT LEARNING SYSTEM SCHEMA
-- Migration: 20251128130000_agent_learning_system.sql
-- Description: Comprehensive learning and training system for AI agents
-- ============================================

-- Learning Examples (Core Training Data)
CREATE TABLE IF NOT EXISTS learning_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL,
    
    -- Example Type
    example_type VARCHAR(50) NOT NULL CHECK (example_type IN (
        'positive',           -- Good example to learn from
        'negative',           -- Bad example to avoid
        'correction',         -- User-corrected output
        'demonstration',      -- Expert demonstration
        'edge_case',          -- Unusual scenario
        'failure',            -- System failure case
        'preference'          -- A vs B preference
    )),
    
    -- Input/Output Pair
    input_context JSONB NOT NULL,      -- Full context including conversation history
    input_text TEXT NOT NULL,           -- The actual user input
    
    -- Outputs
    original_output TEXT,               -- What the agent originally produced
    expected_output TEXT NOT NULL,      -- The correct/preferred output
    
    -- For preference learning (A vs B)
    output_a TEXT,
    output_b TEXT,
    preferred_output VARCHAR(1) CHECK (preferred_output IN ('A', 'B')),
    preference_strength INTEGER CHECK (preference_strength BETWEEN 1 AND 5),
    
    -- Metadata
    domain VARCHAR(100),                -- 'accounting', 'audit', 'tax', etc.
    task_type VARCHAR(100),             -- 'calculation', 'analysis', 'drafting', etc.
    complexity INTEGER CHECK (complexity BETWEEN 1 AND 5),
    jurisdictions JSONB DEFAULT '[]',   -- ['US', 'UK', 'EU']
    tags JSONB DEFAULT '[]',            -- ['ifrs_15', 'revenue', 'complex']
    
    -- Quality Metrics
    quality_score DECIMAL(3,2),         -- 0.00 to 1.00
    confidence_score DECIMAL(3,2),
    
    -- Source
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'user_feedback',      -- Direct user feedback
        'expert_review',      -- Expert annotation
        'automated',          -- System-generated
        'synthetic',          -- AI-generated training data
        'imported'            -- External dataset
    )),
    source_user_id UUID,
    source_execution_id UUID,
    
    -- Review Status
    review_status VARCHAR(50) DEFAULT 'pending' CHECK (review_status IN (
        'pending', 'in_review', 'approved', 'rejected', 'needs_revision'
    )),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Usage Tracking
    times_used_in_training INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Feedback (Quick Ratings)
CREATE TABLE IF NOT EXISTS agent_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Rating
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    
    -- Specific Dimensions
    accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
    helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5),
    clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
    completeness_rating INTEGER CHECK (completeness_rating BETWEEN 1 AND 5),
    
    -- Feedback Type
    feedback_type VARCHAR(50) CHECK (feedback_type IN (
        'thumbs_up',
        'thumbs_down',
        'star_rating',
        'detailed_feedback',
        'correction',
        'report_issue'
    )),
    
    -- Detailed Feedback
    feedback_text TEXT,
    correction_text TEXT,
    
    -- Issue Categories
    issue_categories JSONB DEFAULT '[]', -- ['incorrect', 'incomplete', 'unclear', 'hallucination']
    
    -- Context
    task_context JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expert Annotations
CREATE TABLE IF NOT EXISTS expert_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_example_id UUID NOT NULL REFERENCES learning_examples(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL,
    
    -- Annotation Type
    annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN (
        'quality_assessment',
        'correction',
        'explanation',
        'categorization',
        'difficulty_rating'
    )),
    
    -- Annotation Content
    annotation_data JSONB NOT NULL,
    
    -- Quality Scores
    technical_accuracy DECIMAL(3,2),
    professional_quality DECIMAL(3,2),
    completeness DECIMAL(3,2),
    clarity DECIMAL(3,2),
    
    -- Expert Notes
    notes TEXT,
    improvement_suggestions TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Datasets
CREATE TABLE IF NOT EXISTS training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    
    -- Scope
    agent_ids JSONB DEFAULT '[]',       -- Which agents this dataset is for
    domains JSONB DEFAULT '[]',
    task_types JSONB DEFAULT '[]',
    
    -- Statistics
    total_examples INTEGER DEFAULT 0,
    positive_examples INTEGER DEFAULT 0,
    negative_examples INTEGER DEFAULT 0,
    correction_examples INTEGER DEFAULT 0,
    
    -- Quality Metrics
    avg_quality_score DECIMAL(3,2),
    human_verified_percentage DECIMAL(5,2),
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'collecting', 'processing', 'ready', 'in_use', 'archived'
    )),
    
    -- Usage
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dataset-Example Assignments
CREATE TABLE IF NOT EXISTS dataset_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES training_datasets(id) ON DELETE CASCADE,
    example_id UUID NOT NULL REFERENCES learning_examples(id) ON DELETE CASCADE,
    
    -- Split
    split VARCHAR(20) DEFAULT 'train' CHECK (split IN ('train', 'validation', 'test')),
    
    -- Weight (for importance sampling)
    weight DECIMAL(5,4) DEFAULT 1.0,
    
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(dataset_id, example_id)
);

-- Training Runs
CREATE TABLE IF NOT EXISTS training_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Target
    agent_id UUID NOT NULL,
    dataset_id UUID NOT NULL REFERENCES training_datasets(id),
    
    -- Training Type
    training_type VARCHAR(50) NOT NULL CHECK (training_type IN (
        'prompt_optimization',
        'rag_tuning',
        'fine_tuning',
        'rlhf',
        'dpo'
    )),
    
    -- Configuration
    config JSONB NOT NULL,
    hyperparameters JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    
    -- Progress
    progress_percentage INTEGER DEFAULT 0,
    current_step INTEGER,
    total_steps INTEGER,
    
    -- Metrics
    metrics JSONB DEFAULT '{}',
    best_metrics JSONB,
    
    -- Artifacts
    model_artifact_path TEXT,
    prompt_artifact_path TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Review
    requires_review BOOLEAN DEFAULT true,
    reviewed_by UUID,
    review_status VARCHAR(50),
    review_notes TEXT,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Test Experiments
CREATE TABLE IF NOT EXISTS learning_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT,
    
    -- Target
    agent_id UUID NOT NULL,
    
    -- Variants
    control_config JSONB NOT NULL,      -- Original configuration
    treatment_config JSONB NOT NULL,    -- New configuration to test
    
    -- Traffic Split
    control_percentage INTEGER DEFAULT 50,
    treatment_percentage INTEGER DEFAULT 50,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'running', 'paused', 'completed', 'cancelled'
    )),
    
    -- Duration
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    min_duration_hours INTEGER DEFAULT 168, -- 1 week minimum
    
    -- Sample Size
    min_sample_size INTEGER DEFAULT 1000,
    current_control_samples INTEGER DEFAULT 0,
    current_treatment_samples INTEGER DEFAULT 0,
    
    -- Results
    control_metrics JSONB DEFAULT '{}',
    treatment_metrics JSONB DEFAULT '{}',
    statistical_significance DECIMAL(5,4),
    winner VARCHAR(20),
    
    -- Decision
    decision VARCHAR(50) CHECK (decision IN (
        'adopt_treatment', 'keep_control', 'inconclusive', 'rollback'
    )),
    decision_notes TEXT,
    decided_by UUID,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Embedding Training Pairs (for RAG improvement)
CREATE TABLE IF NOT EXISTS embedding_training_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    document TEXT NOT NULL,
    label VARCHAR(20) NOT NULL CHECK (label IN ('positive', 'negative', 'hard_negative')),
    source_feedback_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_learning_examples_agent ON learning_examples(agent_id, review_status);
CREATE INDEX IF NOT EXISTS idx_learning_examples_domain ON learning_examples(domain, task_type);
CREATE INDEX IF NOT EXISTS idx_learning_examples_source ON learning_examples(source_type, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_examples_org ON learning_examples(organization_id);

CREATE INDEX IF NOT EXISTS idx_feedback_execution ON agent_feedback(execution_id);
CREATE INDEX IF NOT EXISTS idx_feedback_agent ON agent_feedback(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON agent_feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_annotations_example ON expert_annotations(learning_example_id);
CREATE INDEX IF NOT EXISTS idx_annotations_expert ON expert_annotations(expert_id);

CREATE INDEX IF NOT EXISTS idx_datasets_org ON training_datasets(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_training_runs_agent ON training_runs(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_training_runs_dataset ON training_runs(dataset_id);

CREATE INDEX IF NOT EXISTS idx_experiments_agent ON learning_experiments(agent_id, status);

CREATE INDEX IF NOT EXISTS idx_embedding_pairs_label ON embedding_training_pairs(label);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_learning_examples_updated_at BEFORE UPDATE ON learning_examples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_datasets_updated_at BEFORE UPDATE ON training_datasets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (if RLS is enabled)
ALTER TABLE learning_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_training_pairs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your auth system)
CREATE POLICY "Users can view their org's learning examples"
    ON learning_examples FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert feedback"
    ON agent_feedback FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Experts can annotate"
    ON expert_annotations FOR ALL
    USING (expert_id = auth.uid());

-- Comments for documentation
COMMENT ON TABLE learning_examples IS 'Core training examples collected from user feedback, expert annotations, and automated processes';
COMMENT ON TABLE agent_feedback IS 'Quick feedback ratings and corrections from users';
COMMENT ON TABLE expert_annotations IS 'Detailed quality assessments from domain experts';
COMMENT ON TABLE training_datasets IS 'Curated collections of learning examples for training';
COMMENT ON TABLE training_runs IS 'Training job execution records and metrics';
COMMENT ON TABLE learning_experiments IS 'A/B testing experiments for model improvements';
COMMENT ON TABLE embedding_training_pairs IS 'Query-document pairs for RAG embedding fine-tuning';

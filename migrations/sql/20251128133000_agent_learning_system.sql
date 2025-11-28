-- ============================================
-- AGENT LEARNING SYSTEM SCHEMA
-- Migration: Agent Learning, Training & Continuous Improvement
-- Created: 2025-11-28
-- ============================================

-- Learning Examples (Core Training Data)
CREATE TABLE IF NOT EXISTS learning_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    
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
    source_user_id UUID REFERENCES users(id),
    source_execution_id UUID REFERENCES agent_executions(id),
    
    -- Review Status
    review_status VARCHAR(50) DEFAULT 'pending' CHECK (review_status IN (
        'pending', 'in_review', 'approved', 'rejected', 'needs_revision'
    )),
    reviewed_by UUID REFERENCES users(id),
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
    execution_id UUID NOT NULL REFERENCES agent_executions(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
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
    learning_example_id UUID NOT NULL REFERENCES learning_examples(id),
    expert_id UUID NOT NULL REFERENCES users(id),
    
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
    verified_by UUID REFERENCES users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Datasets
CREATE TABLE IF NOT EXISTS training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    
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
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dataset-Example Assignments
CREATE TABLE IF NOT EXISTS dataset_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES training_datasets(id),
    example_id UUID NOT NULL REFERENCES learning_examples(id),
    
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
    agent_id UUID NOT NULL REFERENCES agents(id),
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
    reviewed_by UUID REFERENCES users(id),
    review_status VARCHAR(50),
    review_notes TEXT,
    
    created_by UUID REFERENCES users(id),
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
    agent_id UUID NOT NULL REFERENCES agents(id),
    
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
    decided_by UUID REFERENCES users(id),
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_examples_agent ON learning_examples(agent_id, review_status);
CREATE INDEX IF NOT EXISTS idx_learning_examples_domain ON learning_examples(domain, task_type);
CREATE INDEX IF NOT EXISTS idx_learning_examples_source ON learning_examples(source_type, created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_execution ON agent_feedback(execution_id);
CREATE INDEX IF NOT EXISTS idx_feedback_agent ON agent_feedback(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_training_runs_agent ON training_runs(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_experiments_agent ON learning_experiments(agent_id, status);

-- RLS Policies
ALTER TABLE learning_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_experiments ENABLE ROW LEVEL SECURITY;

-- Learning examples: org members can read, experts can write
CREATE POLICY learning_examples_select ON learning_examples
    FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY learning_examples_insert ON learning_examples
    FOR INSERT WITH CHECK (is_member_of(organization_id));

-- Agent feedback: users can provide feedback on their own executions
CREATE POLICY agent_feedback_select ON agent_feedback
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM agent_executions e WHERE e.id = execution_id AND is_member_of(e.organization_id))
    );

CREATE POLICY agent_feedback_insert ON agent_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Expert annotations: only experts can annotate
CREATE POLICY expert_annotations_select ON expert_annotations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM learning_examples le 
            WHERE le.id = learning_example_id 
            AND is_member_of(le.organization_id)
        )
    );

CREATE POLICY expert_annotations_insert ON expert_annotations
    FOR INSERT WITH CHECK (
        expert_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'expert', 'trainer')
        )
    );

-- Training datasets: org members can read, trainers can manage
CREATE POLICY training_datasets_select ON training_datasets
    FOR SELECT USING (is_member_of(organization_id));

CREATE POLICY training_datasets_manage ON training_datasets
    FOR ALL USING (
        is_member_of(organization_id) AND
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'trainer')
        )
    );

-- Training runs: org members can read, trainers can manage
CREATE POLICY training_runs_select ON training_runs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents a 
            WHERE a.id = agent_id 
            AND is_member_of(a.organization_id)
        )
    );

CREATE POLICY training_runs_manage ON training_runs
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'trainer')
        )
    );

-- Learning experiments: org members can read, experimenters can manage
CREATE POLICY learning_experiments_select ON learning_experiments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents a 
            WHERE a.id = agent_id 
            AND is_member_of(a.organization_id)
        )
    );

CREATE POLICY learning_experiments_manage ON learning_experiments
    FOR ALL USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role IN ('admin', 'trainer', 'experimenter')
        )
    );

-- Functions
CREATE OR REPLACE FUNCTION update_learning_example_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER learning_examples_updated
    BEFORE UPDATE ON learning_examples
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_example_timestamp();

CREATE TRIGGER training_datasets_updated
    BEFORE UPDATE ON training_datasets
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_example_timestamp();

-- Comments
COMMENT ON TABLE learning_examples IS 'Core training data collected from user feedback and expert demonstrations';
COMMENT ON TABLE agent_feedback IS 'Quick user feedback ratings and corrections';
COMMENT ON TABLE expert_annotations IS 'Expert quality assessments and annotations';
COMMENT ON TABLE training_datasets IS 'Curated datasets for agent training';
COMMENT ON TABLE training_runs IS 'Training job executions and results';
COMMENT ON TABLE learning_experiments IS 'A/B experiments for agent improvements';

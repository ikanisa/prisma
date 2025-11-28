-- ============================================
-- AGENT LEARNING SYSTEM - COMPREHENSIVE SCHEMA
-- ============================================
-- Extends existing agent_feedback with full learning infrastructure
-- for collecting training data, running experiments, and deploying improvements.

-- ============================================
-- LEARNING EXAMPLES (Core Training Data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
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
    input_context JSONB NOT NULL DEFAULT '{}',
    input_text TEXT NOT NULL,
    
    -- Outputs
    original_output TEXT,
    expected_output TEXT NOT NULL,
    
    -- For preference learning (A vs B)
    output_a TEXT,
    output_b TEXT,
    preferred_output VARCHAR(1) CHECK (preferred_output IN ('A', 'B')),
    preference_strength INTEGER CHECK (preference_strength BETWEEN 1 AND 5),
    
    -- Metadata
    domain VARCHAR(100),
    task_type VARCHAR(100),
    complexity INTEGER CHECK (complexity BETWEEN 1 AND 5),
    jurisdictions JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    
    -- Quality Metrics
    quality_score DECIMAL(3,2) CHECK (quality_score BETWEEN 0 AND 1),
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    
    -- Source
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'user_feedback',
        'expert_review',
        'automated',
        'synthetic',
        'imported'
    )),
    source_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    source_execution_id UUID,
    
    -- Review Status
    review_status VARCHAR(50) DEFAULT 'pending' CHECK (review_status IN (
        'pending', 'in_review', 'approved', 'rejected', 'needs_revision'
    )),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Usage Tracking
    times_used_in_training INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.learning_examples ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_learning_examples_agent ON public.learning_examples(agent_id, review_status);
CREATE INDEX IF NOT EXISTS idx_learning_examples_domain ON public.learning_examples(domain, task_type);
CREATE INDEX IF NOT EXISTS idx_learning_examples_source ON public.learning_examples(source_type, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_examples_org ON public.learning_examples(organization_id, created_at DESC);

-- ============================================
-- EXPERT ANNOTATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.expert_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_example_id UUID NOT NULL REFERENCES public.learning_examples(id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Annotation Type
    annotation_type VARCHAR(50) NOT NULL CHECK (annotation_type IN (
        'quality_assessment',
        'correction',
        'explanation',
        'categorization',
        'difficulty_rating'
    )),
    
    -- Annotation Content
    annotation_data JSONB NOT NULL DEFAULT '{}',
    
    -- Quality Scores
    technical_accuracy DECIMAL(3,2) CHECK (technical_accuracy BETWEEN 0 AND 1),
    professional_quality DECIMAL(3,2) CHECK (professional_quality BETWEEN 0 AND 1),
    completeness DECIMAL(3,2) CHECK (completeness BETWEEN 0 AND 1),
    clarity DECIMAL(3,2) CHECK (clarity BETWEEN 0 AND 1),
    
    -- Expert Notes
    notes TEXT,
    improvement_suggestions TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expert_annotations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_expert_annotations_example ON public.expert_annotations(learning_example_id);
CREATE INDEX IF NOT EXISTS idx_expert_annotations_expert ON public.expert_annotations(expert_id, created_at DESC);

-- ============================================
-- TRAINING DATASETS
-- ============================================
CREATE TABLE IF NOT EXISTS public.training_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    
    -- Scope
    agent_ids JSONB DEFAULT '[]',
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
    
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.training_datasets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_datasets_org ON public.training_datasets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_training_datasets_status ON public.training_datasets(status, created_at DESC);

-- ============================================
-- DATASET-EXAMPLE ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.dataset_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES public.training_datasets(id) ON DELETE CASCADE,
    example_id UUID NOT NULL REFERENCES public.learning_examples(id) ON DELETE CASCADE,
    
    -- Split
    split VARCHAR(20) DEFAULT 'train' CHECK (split IN ('train', 'validation', 'test')),
    
    -- Weight (for importance sampling)
    weight DECIMAL(5,4) DEFAULT 1.0 CHECK (weight > 0),
    
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(dataset_id, example_id)
);

ALTER TABLE public.dataset_examples ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dataset_examples_dataset ON public.dataset_examples(dataset_id, split);
CREATE INDEX IF NOT EXISTS idx_dataset_examples_example ON public.dataset_examples(example_id);

-- ============================================
-- TRAINING RUNS
-- ============================================
CREATE TABLE IF NOT EXISTS public.training_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Target
    agent_id UUID NOT NULL,
    dataset_id UUID NOT NULL REFERENCES public.training_datasets(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Training Type
    training_type VARCHAR(50) NOT NULL CHECK (training_type IN (
        'prompt_optimization',
        'rag_tuning',
        'fine_tuning',
        'rlhf',
        'dpo',
        'behavior_cloning'
    )),
    
    -- Configuration
    config JSONB NOT NULL DEFAULT '{}',
    hyperparameters JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    
    -- Progress
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    current_step INTEGER,
    total_steps INTEGER,
    
    -- Metrics
    metrics JSONB DEFAULT '{}',
    best_metrics JSONB,
    
    -- Artifacts
    model_artifact_path TEXT,
    prompt_artifact_path TEXT,
    logs_path TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Review
    requires_review BOOLEAN DEFAULT true,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    review_status VARCHAR(50),
    review_notes TEXT,
    
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.training_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_runs_agent ON public.training_runs(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_training_runs_org ON public.training_runs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_runs_status ON public.training_runs(status, created_at DESC);

-- ============================================
-- A/B TEST EXPERIMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.learning_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hypothesis TEXT,
    
    -- Target
    agent_id UUID NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Variants
    control_config JSONB NOT NULL DEFAULT '{}',
    treatment_config JSONB NOT NULL DEFAULT '{}',
    
    -- Traffic Split
    control_percentage INTEGER DEFAULT 50 CHECK (control_percentage BETWEEN 0 AND 100),
    treatment_percentage INTEGER DEFAULT 50 CHECK (treatment_percentage BETWEEN 0 AND 100),
    
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
    winner VARCHAR(20) CHECK (winner IN ('control', 'treatment', 'inconclusive')),
    
    -- Decision
    decision VARCHAR(50) CHECK (decision IN (
        'adopt_treatment', 'keep_control', 'inconclusive', 'rollback'
    )),
    decision_notes TEXT,
    decided_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.learning_experiments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_experiments_agent ON public.learning_experiments(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_experiments_org ON public.learning_experiments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON public.learning_experiments(status);

-- ============================================
-- EXTEND AGENT_FEEDBACK TABLE
-- ============================================
-- Add columns to existing agent_feedback if they don't exist
DO $$
BEGIN
    -- Add user_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_feedback' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.agent_feedback ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add dimension ratings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_feedback' 
        AND column_name = 'accuracy_rating'
    ) THEN
        ALTER TABLE public.agent_feedback ADD COLUMN accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5);
        ALTER TABLE public.agent_feedback ADD COLUMN helpfulness_rating INTEGER CHECK (helpfulness_rating BETWEEN 1 AND 5);
        ALTER TABLE public.agent_feedback ADD COLUMN clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5);
        ALTER TABLE public.agent_feedback ADD COLUMN completeness_rating INTEGER CHECK (completeness_rating BETWEEN 1 AND 5);
    END IF;
    
    -- Add feedback_type if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_feedback' 
        AND column_name = 'feedback_type'
    ) THEN
        ALTER TABLE public.agent_feedback ADD COLUMN feedback_type VARCHAR(50) CHECK (feedback_type IN (
            'thumbs_up', 'thumbs_down', 'star_rating', 'detailed_feedback', 'correction', 'report_issue'
        ));
    END IF;
    
    -- Add feedback_text if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_feedback' 
        AND column_name = 'feedback_text'
    ) THEN
        ALTER TABLE public.agent_feedback ADD COLUMN feedback_text TEXT;
    END IF;
    
    -- Add correction_text if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_feedback' 
        AND column_name = 'correction_text'
    ) THEN
        ALTER TABLE public.agent_feedback ADD COLUMN correction_text TEXT;
    END IF;
    
    -- Add issue_categories if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_feedback' 
        AND column_name = 'issue_categories'
    ) THEN
        ALTER TABLE public.agent_feedback ADD COLUMN issue_categories JSONB DEFAULT '[]';
    END IF;
    
    -- Add task_context if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_feedback' 
        AND column_name = 'task_context'
    ) THEN
        ALTER TABLE public.agent_feedback ADD COLUMN task_context JSONB DEFAULT '{}';
    END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Learning Examples Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'learning_examples_org_read' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY learning_examples_org_read ON public.learning_examples
            FOR SELECT USING (public.is_member_of(organization_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'learning_examples_org_write' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY learning_examples_org_write ON public.learning_examples
            FOR ALL USING (public.has_min_role(organization_id, 'MANAGER'));
    END IF;
END $$;

-- Expert Annotations Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'expert_annotations_read' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY expert_annotations_read ON public.expert_annotations
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.learning_examples le
                    WHERE le.id = learning_example_id
                    AND public.is_member_of(le.organization_id)
                )
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'expert_annotations_create' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY expert_annotations_create ON public.expert_annotations
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.learning_examples le
                    WHERE le.id = learning_example_id
                    AND public.has_min_role(le.organization_id, 'MANAGER')
                )
            );
    END IF;
END $$;

-- Training Datasets Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'training_datasets_org_read' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY training_datasets_org_read ON public.training_datasets
            FOR SELECT USING (public.is_member_of(organization_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'training_datasets_org_write' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY training_datasets_org_write ON public.training_datasets
            FOR ALL USING (public.has_min_role(organization_id, 'MANAGER'));
    END IF;
END $$;

-- Dataset Examples Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'dataset_examples_read' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY dataset_examples_read ON public.dataset_examples
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.training_datasets td
                    WHERE td.id = dataset_id
                    AND public.is_member_of(td.organization_id)
                )
            );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'dataset_examples_write' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY dataset_examples_write ON public.dataset_examples
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.training_datasets td
                    WHERE td.id = dataset_id
                    AND public.has_min_role(td.organization_id, 'MANAGER')
                )
            );
    END IF;
END $$;

-- Training Runs Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'training_runs_org_read' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY training_runs_org_read ON public.training_runs
            FOR SELECT USING (public.is_member_of(organization_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'training_runs_org_write' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY training_runs_org_write ON public.training_runs
            FOR ALL USING (public.has_min_role(organization_id, 'MANAGER'));
    END IF;
END $$;

-- Learning Experiments Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'learning_experiments_org_read' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY learning_experiments_org_read ON public.learning_experiments
            FOR SELECT USING (public.is_member_of(organization_id));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'learning_experiments_org_write' 
        AND schemaname = 'public'
    ) THEN
        CREATE POLICY learning_experiments_org_write ON public.learning_experiments
            FOR ALL USING (public.has_min_role(organization_id, 'MANAGER'));
    END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get learning statistics
CREATE OR REPLACE FUNCTION public.get_learning_stats(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'pending_annotations', (
            SELECT COUNT(*) 
            FROM public.learning_examples 
            WHERE organization_id = org_id 
            AND review_status = 'pending'
        ),
        'annotated_today', (
            SELECT COUNT(*) 
            FROM public.expert_annotations ea
            JOIN public.learning_examples le ON ea.learning_example_id = le.id
            WHERE le.organization_id = org_id 
            AND ea.created_at::date = CURRENT_DATE
        ),
        'total_examples', (
            SELECT COUNT(*) 
            FROM public.learning_examples 
            WHERE organization_id = org_id
        ),
        'active_experiments', (
            SELECT COUNT(*) 
            FROM public.learning_experiments 
            WHERE organization_id = org_id 
            AND status = 'running'
        ),
        'running_training', (
            SELECT COUNT(*) 
            FROM public.training_runs 
            WHERE organization_id = org_id 
            AND status = 'running'
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- Function to calculate dataset statistics
CREATE OR REPLACE FUNCTION public.update_dataset_stats(dataset_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.training_datasets td
    SET 
        total_examples = (
            SELECT COUNT(*) 
            FROM public.dataset_examples 
            WHERE dataset_id = dataset_id_param
        ),
        positive_examples = (
            SELECT COUNT(*) 
            FROM public.dataset_examples de
            JOIN public.learning_examples le ON de.example_id = le.id
            WHERE de.dataset_id = dataset_id_param 
            AND le.example_type = 'positive'
        ),
        negative_examples = (
            SELECT COUNT(*) 
            FROM public.dataset_examples de
            JOIN public.learning_examples le ON de.example_id = le.id
            WHERE de.dataset_id = dataset_id_param 
            AND le.example_type = 'negative'
        ),
        correction_examples = (
            SELECT COUNT(*) 
            FROM public.dataset_examples de
            JOIN public.learning_examples le ON de.example_id = le.id
            WHERE de.dataset_id = dataset_id_param 
            AND le.example_type = 'correction'
        ),
        avg_quality_score = (
            SELECT AVG(le.quality_score)
            FROM public.dataset_examples de
            JOIN public.learning_examples le ON de.example_id = le.id
            WHERE de.dataset_id = dataset_id_param 
            AND le.quality_score IS NOT NULL
        ),
        human_verified_percentage = (
            SELECT (COUNT(CASE WHEN le.review_status = 'approved' THEN 1 END)::decimal / NULLIF(COUNT(*), 0)) * 100
            FROM public.dataset_examples de
            JOIN public.learning_examples le ON de.example_id = le.id
            WHERE de.dataset_id = dataset_id_param
        ),
        updated_at = NOW()
    WHERE id = dataset_id_param;
END;
$$;

-- Trigger to auto-update dataset stats when examples are added/removed
CREATE OR REPLACE FUNCTION public.trigger_update_dataset_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM public.update_dataset_stats(NEW.dataset_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.update_dataset_stats(OLD.dataset_id);
        RETURN OLD;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trigger_dataset_examples_stats ON public.dataset_examples;
CREATE TRIGGER trigger_dataset_examples_stats
    AFTER INSERT OR UPDATE OR DELETE ON public.dataset_examples
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_update_dataset_stats();

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON public.learning_examples TO authenticated;
GRANT SELECT ON public.expert_annotations TO authenticated;
GRANT SELECT ON public.training_datasets TO authenticated;
GRANT SELECT ON public.dataset_examples TO authenticated;
GRANT SELECT ON public.training_runs TO authenticated;
GRANT SELECT ON public.learning_experiments TO authenticated;

-- Allow inserts for authenticated users (RLS will restrict)
GRANT INSERT ON public.learning_examples TO authenticated;
GRANT INSERT ON public.expert_annotations TO authenticated;
GRANT INSERT ON public.agent_feedback TO authenticated;

COMMENT ON TABLE public.learning_examples IS 'Training examples collected from user feedback, expert demonstrations, and corrections';
COMMENT ON TABLE public.expert_annotations IS 'Expert quality assessments and annotations for learning examples';
COMMENT ON TABLE public.training_datasets IS 'Curated datasets for training and evaluation';
COMMENT ON TABLE public.dataset_examples IS 'Many-to-many relationship between datasets and examples';
COMMENT ON TABLE public.training_runs IS 'Training jobs for prompt optimization, fine-tuning, and behavior learning';
COMMENT ON TABLE public.learning_experiments IS 'A/B tests for evaluating agent improvements';

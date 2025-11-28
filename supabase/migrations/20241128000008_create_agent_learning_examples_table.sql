-- Migration: Create agent_learning_examples table
-- Description: Stores learning examples for continuous agent improvement
-- Author: Prisma Glow Team
-- Date: 2024-11-28

CREATE TABLE IF NOT EXISTS agent_learning_examples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES agent_executions(id) ON DELETE SET NULL,
    
    -- Example data
    input_example TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    actual_output TEXT,
    
    -- Classification
    example_type VARCHAR(50) CHECK (example_type IN (
        'positive',       -- Good example to learn from
        'negative',       -- Bad example to avoid
        'correction',     -- Corrected output
        'edge_case'       -- Edge case handling
    )),
    
    -- Quality
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
    reviewed BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_learning_examples_agent ON agent_learning_examples(agent_id);
CREATE INDEX idx_agent_learning_examples_type ON agent_learning_examples(example_type);
CREATE INDEX idx_agent_learning_examples_reviewed ON agent_learning_examples(reviewed);
CREATE INDEX idx_agent_learning_examples_tags ON agent_learning_examples USING GIN(tags);

ALTER TABLE agent_learning_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_learning_examples_policy ON agent_learning_examples FOR ALL
    USING (agent_id IN (SELECT id FROM agents WHERE organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())));

COMMENT ON TABLE agent_learning_examples IS 'Learning examples for continuous agent improvement';

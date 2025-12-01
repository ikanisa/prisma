-- ============================================
-- AUTO-CLASSIFICATION SUPPORT
-- ============================================
-- Adds columns to track automatic classification of web sources
-- by heuristic rules and/or LLM-based classification

-- Add auto-classification tracking columns to deep_search_sources
ALTER TABLE public.deep_search_sources
    ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS classification_confidence INTEGER CHECK (classification_confidence BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS classification_source TEXT CHECK (classification_source IN ('HEURISTIC', 'LLM', 'MIXED', 'MANUAL'));

-- Create index for filtering auto-classified sources
CREATE INDEX IF NOT EXISTS idx_deep_search_sources_auto_classified 
    ON public.deep_search_sources(auto_classified, classification_confidence)
    WHERE auto_classified = true;

-- Add comment explaining the columns
COMMENT ON COLUMN public.deep_search_sources.auto_classified IS 
    'Indicates whether this source was automatically classified by the system';
COMMENT ON COLUMN public.deep_search_sources.classification_confidence IS 
    'Confidence score (0-100) of the automatic classification';
COMMENT ON COLUMN public.deep_search_sources.classification_source IS 
    'Method used for classification: HEURISTIC (rule-based), LLM (AI-based), MIXED (both), MANUAL (human-edited)';

-- Also add to curated_knowledge_base for consistency
ALTER TABLE public.curated_knowledge_base
    ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS classification_confidence INTEGER CHECK (classification_confidence BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS classification_source TEXT CHECK (classification_source IN ('HEURISTIC', 'LLM', 'MIXED', 'MANUAL'));

CREATE INDEX IF NOT EXISTS idx_ckb_auto_classified 
    ON public.curated_knowledge_base(auto_classified, classification_confidence)
    WHERE auto_classified = true;

COMMENT ON COLUMN public.curated_knowledge_base.auto_classified IS 
    'Indicates whether this entry was automatically classified by the system';
COMMENT ON COLUMN public.curated_knowledge_base.classification_confidence IS 
    'Confidence score (0-100) of the automatic classification';
COMMENT ON COLUMN public.curated_knowledge_base.classification_source IS 
    'Method used for classification: HEURISTIC (rule-based), LLM (AI-based), MIXED (both), MANUAL (human-edited)';

-- Backwards compatibility: add to legacy web_knowledge_sources if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'web_knowledge_sources'
    ) THEN
        ALTER TABLE public.web_knowledge_sources
            ADD COLUMN IF NOT EXISTS auto_classified BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS classification_confidence INTEGER CHECK (classification_confidence BETWEEN 0 AND 100),
            ADD COLUMN IF NOT EXISTS classification_source TEXT CHECK (classification_source IN ('HEURISTIC', 'LLM', 'MIXED', 'MANUAL'));
        
        CREATE INDEX IF NOT EXISTS idx_web_knowledge_sources_auto_classified 
            ON public.web_knowledge_sources(auto_classified)
            WHERE auto_classified = true;
    END IF;
END $$;

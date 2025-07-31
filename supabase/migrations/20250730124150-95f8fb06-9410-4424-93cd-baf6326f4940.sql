-- Create memory access patterns table for behavioral analysis
CREATE TABLE IF NOT EXISTS memory_access_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  access_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  context_type TEXT,
  time_of_day INTEGER,
  day_of_week INTEGER,
  memory_types_accessed TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forgotten memories archive
CREATE TABLE IF NOT EXISTS forgotten_memories_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_memory_id UUID,
  user_id TEXT NOT NULL,
  memory_key TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  memory_value JSONB,
  forgotten_at TIMESTAMP WITH TIME ZONE NOT NULL,
  forgetting_reason TEXT NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user behavior patterns table
CREATE TABLE IF NOT EXISTS user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'temporal', 'intent_flow', 'preference_evolution'
  pattern_data JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0.5,
  observations_count INTEGER DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, pattern_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_access_patterns_user_time ON memory_access_patterns(user_id, access_time);
CREATE INDEX IF NOT EXISTS idx_memory_access_patterns_context ON memory_access_patterns(context_type, time_of_day);
CREATE INDEX IF NOT EXISTS idx_forgotten_memories_user ON forgotten_memories_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_user ON user_behavior_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_patterns_confidence ON user_behavior_patterns(confidence_score);

-- Enable RLS on new tables
ALTER TABLE memory_access_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE forgotten_memories_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "System can manage memory access patterns" ON memory_access_patterns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage forgotten memories" ON forgotten_memories_archive  
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage behavior patterns" ON user_behavior_patterns
  FOR ALL USING (true) WITH CHECK (true);

-- Create function to update behavior patterns
CREATE OR REPLACE FUNCTION update_behavior_pattern(
  p_user_id TEXT,
  p_pattern_type TEXT,
  p_pattern_data JSONB,
  p_confidence NUMERIC DEFAULT 0.5
) RETURNS UUID AS $$
DECLARE
  pattern_id UUID;
BEGIN
  INSERT INTO user_behavior_patterns (
    user_id, 
    pattern_type, 
    pattern_data, 
    confidence_score,
    observations_count,
    last_updated
  ) VALUES (
    p_user_id,
    p_pattern_type,
    p_pattern_data,
    p_confidence,
    1,
    NOW()
  )
  ON CONFLICT (user_id, pattern_type) 
  DO UPDATE SET
    pattern_data = 
      CASE 
        WHEN user_behavior_patterns.confidence_score < p_confidence THEN p_pattern_data
        ELSE jsonb_deep_merge(user_behavior_patterns.pattern_data, p_pattern_data)
      END,
    confidence_score = GREATEST(user_behavior_patterns.confidence_score, p_confidence),
    observations_count = user_behavior_patterns.observations_count + 1,
    last_updated = NOW()
  RETURNING id INTO pattern_id;
  
  RETURN pattern_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to merge JSONB objects deeply
CREATE OR REPLACE FUNCTION jsonb_deep_merge(a JSONB, b JSONB) RETURNS JSONB AS $$
BEGIN
  IF jsonb_typeof(a) = 'object' AND jsonb_typeof(b) = 'object' THEN
    RETURN (
      SELECT jsonb_object_agg(key, 
        CASE 
          WHEN jsonb_typeof(a.value) = 'object' AND jsonb_typeof(b.value) = 'object'
          THEN jsonb_deep_merge(a.value, b.value)
          ELSE COALESCE(b.value, a.value)
        END
      )
      FROM (
        SELECT key, a.value
        FROM jsonb_each(a)
        UNION ALL
        SELECT key, b.value  
        FROM jsonb_each(b)
        WHERE NOT (a ? key)
      ) AS combined
    );
  ELSE
    RETURN COALESCE(b, a);
  END IF;
END;
$$ LANGUAGE plpgsql;
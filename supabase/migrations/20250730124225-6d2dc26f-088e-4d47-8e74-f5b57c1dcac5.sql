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
-- Phase 5: Omni Agent Enhancement Database Schema Extensions
-- All additions are additive to existing schema

-- 1️⃣ Skills toggle per agent
CREATE TABLE IF NOT EXISTS agent_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  skill text NOT NULL,
  enabled boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(agent_id, skill)
);

-- Enable RLS on agent_skills
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage agent skills
CREATE POLICY "System can manage agent skills"
ON agent_skills FOR ALL
USING (true)
WITH CHECK (true);

-- 2️⃣ RAG chunks for long‑term memory with Pinecone integration
CREATE TABLE IF NOT EXISTS rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace text NOT NULL,
  pinecone_id text UNIQUE,
  source_url text,
  source_type text DEFAULT 'document',
  title text,
  content_preview text,
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding_model text DEFAULT 'text-embedding-3-small',
  chunk_size integer,
  chunk_overlap integer,
  processed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rag_chunks
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage RAG chunks
CREATE POLICY "System can manage rag chunks"
ON rag_chunks FOR ALL
USING (true)
WITH CHECK (true);

-- 3️⃣ Enhanced feedback table with sentiment analysis
CREATE TABLE IF NOT EXISTS feedback_enhanced (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  conversation_id uuid,
  user_phone text NOT NULL,
  agent_id uuid REFERENCES agents(id),
  rating integer CHECK (rating IN (-1, 1)),
  comment text,
  sentiment_score numeric,
  sentiment_label text,
  categories text[],
  handled boolean DEFAULT false,
  handled_by uuid,
  handled_at timestamp with time zone,
  resolution_notes text,
  follow_up_required boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on feedback_enhanced
ALTER TABLE feedback_enhanced ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create feedback for their sessions
CREATE POLICY "Users can create own feedback"
ON feedback_enhanced FOR INSERT
WITH CHECK (true);

-- Policy: System can manage all feedback
CREATE POLICY "System can manage feedback"
ON feedback_enhanced FOR ALL
USING (true)
WITH CHECK (true);

-- 4️⃣ Enhanced user memory with embedding support
CREATE TABLE IF NOT EXISTS user_memory_enhanced (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone text NOT NULL,
  agent_id uuid REFERENCES agents(id),
  memory_type text NOT NULL, -- 'preference', 'context', 'behavior', 'history'
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL,
  confidence_score numeric DEFAULT 1.0,
  importance_weight numeric DEFAULT 1.0,
  embedding vector(1536), -- OpenAI embedding dimension
  source_type text DEFAULT 'conversation', -- 'conversation', 'explicit', 'inferred'
  expires_at timestamp with time zone,
  access_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_phone, memory_type, memory_key)
);

-- Enable RLS on user_memory_enhanced
ALTER TABLE user_memory_enhanced ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage user memory
CREATE POLICY "System can manage user memory"
ON user_memory_enhanced FOR ALL
USING (true)
WITH CHECK (true);

-- 5️⃣ Tool execution logs for analytics
CREATE TABLE IF NOT EXISTS tool_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id),
  session_id uuid,
  user_phone text NOT NULL,
  tool_name text NOT NULL,
  tool_version text DEFAULT '1.0',
  input_params jsonb,
  output_result jsonb,
  execution_time_ms integer,
  success boolean NOT NULL,
  error_message text,
  error_code text,
  retry_count integer DEFAULT 0,
  context_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on tool_execution_logs
ALTER TABLE tool_execution_logs ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage tool execution logs
CREATE POLICY "System can manage tool logs"
ON tool_execution_logs FOR ALL
USING (true)
WITH CHECK (true);

-- 6️⃣ Content safety and moderation
CREATE TABLE IF NOT EXISTS content_moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL, -- 'message', 'image', 'document'
  content_hash text,
  user_phone text NOT NULL,
  agent_id uuid REFERENCES agents(id),
  moderation_result jsonb NOT NULL,
  action_taken text, -- 'allowed', 'flagged', 'blocked', 'escalated'
  confidence_score numeric,
  reviewer_id uuid,
  review_notes text,
  escalated_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on content_moderation_logs
ALTER TABLE content_moderation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage moderation logs
CREATE POLICY "System can manage moderation logs"
ON content_moderation_logs FOR ALL
USING (true)
WITH CHECK (true);

-- 7️⃣ Learning metrics and continuous improvement
CREATE TABLE IF NOT EXISTS learning_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL, -- 'accuracy', 'satisfaction', 'completion_rate', 'response_time'
  metric_value numeric NOT NULL,
  metric_context jsonb DEFAULT '{}'::jsonb,
  measurement_period text DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
  agent_id uuid REFERENCES agents(id),
  skill_name text,
  user_segment text,
  calculated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on learning_metrics
ALTER TABLE learning_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage learning metrics
CREATE POLICY "System can manage learning metrics"
ON learning_metrics FOR ALL
USING (true)
WITH CHECK (true);

-- 8️⃣ Automated task queue for background processing
CREATE TABLE IF NOT EXISTS automated_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL, -- 'embedding', 'moderation', 'analysis', 'notification'
  task_name text NOT NULL,
  payload jsonb NOT NULL,
  priority integer DEFAULT 5, -- 1 (highest) to 10 (lowest)
  status text DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  scheduled_for timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  result jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on automated_tasks
ALTER TABLE automated_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: System can manage automated tasks
CREATE POLICY "System can manage automated tasks"
ON automated_tasks FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent_id ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_skill ON agent_skills(skill);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_namespace ON rag_chunks(namespace);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_pinecone_id ON rag_chunks(pinecone_id);
CREATE INDEX IF NOT EXISTS idx_feedback_enhanced_user_phone ON feedback_enhanced(user_phone);
CREATE INDEX IF NOT EXISTS idx_feedback_enhanced_rating ON feedback_enhanced(rating);
CREATE INDEX IF NOT EXISTS idx_user_memory_enhanced_user_phone ON user_memory_enhanced(user_phone);
CREATE INDEX IF NOT EXISTS idx_user_memory_enhanced_type_key ON user_memory_enhanced(memory_type, memory_key);
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_tool_name ON tool_execution_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_execution_logs_user_phone ON tool_execution_logs(user_phone);
CREATE INDEX IF NOT EXISTS idx_content_moderation_logs_user_phone ON content_moderation_logs(user_phone);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_type ON learning_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_automated_tasks_status ON automated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_automated_tasks_scheduled ON automated_tasks(scheduled_for);

-- Trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_agent_skills_updated_at
  BEFORE UPDATE ON agent_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rag_chunks_updated_at
  BEFORE UPDATE ON rag_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_enhanced_updated_at
  BEFORE UPDATE ON feedback_enhanced
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memory_enhanced_updated_at
  BEFORE UPDATE ON user_memory_enhanced
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automated_tasks_updated_at
  BEFORE UPDATE ON automated_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
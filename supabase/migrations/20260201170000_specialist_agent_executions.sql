-- Agent Executions Logging Table
-- Tracks all specialist agent executions for monitoring and analytics

CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  message TEXT NOT NULL,
  response TEXT,
  jurisdiction_code TEXT,
  engine TEXT NOT NULL CHECK (engine IN ('openai', 'gemini')),
  tool_calls_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_executions_engine ON agent_executions(engine);

-- RLS policies
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

-- Users can read their own executions
CREATE POLICY "Users can read own executions"
  ON agent_executions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert executions
CREATE POLICY "Service role can insert executions"
  ON agent_executions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can read all executions
CREATE POLICY "Admins can read all executions"
  ON agent_executions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role = 'admin'
    )
  );

-- Agent execution statistics view
CREATE OR REPLACE VIEW agent_execution_stats AS
SELECT
  agent_id,
  engine,
  COUNT(*) as total_executions,
  AVG(execution_time_ms) as avg_execution_time_ms,
  SUM(tool_calls_count) as total_tool_calls,
  MAX(created_at) as last_execution_at
FROM agent_executions
GROUP BY agent_id, engine;

-- Grant access to stats view
GRANT SELECT ON agent_execution_stats TO authenticated;

COMMENT ON TABLE agent_executions IS 'Logs all specialist agent executions for monitoring and analytics';
COMMENT ON COLUMN agent_executions.agent_id IS 'ID from agents.registry.yaml (e.g., tax-compliance-mt-034)';
COMMENT ON COLUMN agent_executions.engine IS 'AI engine used: openai or gemini';
COMMENT ON COLUMN agent_executions.tool_calls_count IS 'Number of tool executions (DeepSearch, Supabase, etc.)';
COMMENT ON COLUMN agent_executions.metadata IS 'Additional metadata: usage stats, model info, etc.';

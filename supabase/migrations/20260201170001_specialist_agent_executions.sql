-- Agent Executions Logging Table Enhancement
-- Adds columns and indexes for specialist agent execution tracking
-- Note: Uses defensive checks for existing tables/columns

-- Helper function to check if column exists
CREATE OR REPLACE FUNCTION _temp_col_exists_ae(t_name text, c_name text) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = t_name AND column_name = c_name
  );
END;
$$ LANGUAGE plpgsql;

-- Create table if not exists with base columns
CREATE TABLE IF NOT EXISTS agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  message TEXT,
  response TEXT,
  jurisdiction_code TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ BEGIN
  IF NOT _temp_col_exists_ae('agent_executions', 'engine') THEN
    ALTER TABLE agent_executions ADD COLUMN engine TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _temp_col_exists_ae('agent_executions', 'tool_calls_count') THEN
    ALTER TABLE agent_executions ADD COLUMN tool_calls_count INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT _temp_col_exists_ae('agent_executions', 'execution_time_ms') THEN
    ALTER TABLE agent_executions ADD COLUMN execution_time_ms INTEGER;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent_id ON agent_executions(agent_id);
DO $$ BEGIN
  IF _temp_col_exists_ae('agent_executions', 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_agent_executions_user_id ON agent_executions(user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_executions_session_id ON agent_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_created_at ON agent_executions(created_at DESC);

DO $$ BEGIN
  IF _temp_col_exists_ae('agent_executions', 'engine') THEN
    CREATE INDEX IF NOT EXISTS idx_agent_executions_engine ON agent_executions(engine);
  END IF;
END $$;

-- RLS policies
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "agent_executions_user_read" ON agent_executions;
DROP POLICY IF EXISTS "agent_executions_service_insert" ON agent_executions;
DROP POLICY IF EXISTS "agent_executions_admin_read" ON agent_executions;

-- Users can read their own executions
DO $$ BEGIN
  IF _temp_col_exists_ae('agent_executions', 'user_id') THEN
    EXECUTE 'CREATE POLICY "agent_executions_user_read" ON agent_executions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Service role can insert executions
CREATE POLICY "agent_executions_service_insert" ON agent_executions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Agent execution statistics view (only if engine column exists)
DO $$ BEGIN
  IF _temp_col_exists_ae('agent_executions', 'engine') AND 
     _temp_col_exists_ae('agent_executions', 'execution_time_ms') AND
     _temp_col_exists_ae('agent_executions', 'tool_calls_count') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW agent_execution_stats AS
      SELECT
        agent_id,
        engine,
        COUNT(*) as total_executions,
        AVG(execution_time_ms) as avg_execution_time_ms,
        SUM(tool_calls_count) as total_tool_calls,
        MAX(created_at) as last_execution_at
      FROM agent_executions
      GROUP BY agent_id, engine';
    GRANT SELECT ON agent_execution_stats TO authenticated;
  END IF;
END $$;

-- Cleanup helper function
DROP FUNCTION IF EXISTS _temp_col_exists_ae(text, text);

COMMENT ON TABLE agent_executions IS 'Logs all specialist agent executions for monitoring and analytics';

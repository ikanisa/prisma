-- Database Cleanup and Consolidation Migration
-- Remove duplicate/legacy tables and functions

-- 1. Drop backup tables that are no longer needed
DROP TABLE IF EXISTS businesses_backup CASCADE;

-- 2. Remove duplicate edge functions that are no longer referenced
-- (These will be manually removed from the functions directory)

-- 3. Clean up unused agent-related tables that have overlapping functionality
-- Keep agent_configs as the main configuration table
-- Keep agent_memory_enhanced as the main memory table (drop basic agent_memory)
DROP TABLE IF EXISTS agent_memory CASCADE;

-- 4. Consolidate conversation tables
-- Remove redundant conversation analytics table and integrate into main conversations
ALTER TABLE conversation_messages 
ADD COLUMN IF NOT EXISTS avg_response_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS satisfaction_rating INTEGER,
ADD COLUMN IF NOT EXISTS flow_completed BOOLEAN DEFAULT false;

-- 5. Add indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_conversation_messages_phone_created 
ON conversation_messages(phone_number, created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender 
ON conversation_messages(sender);

CREATE INDEX IF NOT EXISTS idx_contacts_phone_status 
ON contacts(phone_number, status);

CREATE INDEX IF NOT EXISTS idx_agent_runs_status_created 
ON agent_runs(status, created_at);

-- 6. Update RLS policies to be more efficient
-- Drop and recreate some policies with better performance

-- 7. Create a function to clean up old conversation messages (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
  -- Delete messages older than 1 year with status 'deleted'
  DELETE FROM conversation_messages 
  WHERE created_at < NOW() - INTERVAL '1 year' 
  AND status = 'deleted';
  
  -- Archive very old messages (older than 2 years) to a separate table
  -- This could be implemented later if needed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create automated cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-messages', '0 2 * * 0', 'SELECT cleanup_old_messages();');

-- 9. Optimize database by running VACUUM and ANALYZE
-- Note: This should be run manually as it can be resource intensive
-- VACUUM ANALYZE;
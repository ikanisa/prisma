-- Fix RLS Policies for Agent Tables
-- Updated to match the actual database schema

-- Drop existing policies (if any)
DROP POLICY IF EXISTS agent_executions_org_isolation ON agent_executions;
DROP POLICY IF EXISTS agent_conversations_org_isolation ON agent_conversations;
DROP POLICY IF EXISTS agent_messages_via_conversation ON agent_conversation_messages;
DROP POLICY IF EXISTS agent_audit_org_isolation ON agent_audit_log;
DROP POLICY IF EXISTS agent_quotas_org_isolation ON agent_usage_quotas;

-- RLS Policies for agent_executions
-- Users can access executions from organizations they are members of
CREATE POLICY agent_executions_org_isolation ON agent_executions
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for agent_conversations
CREATE POLICY agent_conversations_org_isolation ON agent_conversations
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for agent_conversation_messages
-- Users can access messages from conversations in their organizations
CREATE POLICY agent_messages_via_conversation ON agent_conversation_messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM agent_conversations WHERE org_id IN (
                SELECT org_id FROM memberships WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for agent_audit_log
-- Users can view audit logs from their organizations
CREATE POLICY agent_audit_org_isolation ON agent_audit_log
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for agent_usage_quotas
-- Users can view quotas for their organizations
CREATE POLICY agent_quotas_org_isolation ON agent_usage_quotas
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
    );

-- Verify policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'agent_%'
ORDER BY tablename, policyname;

-- Fix RLS Policies for Agent Tables
-- This updates the policies to work with your existing schema

-- Drop existing policies
DROP POLICY IF EXISTS agent_executions_org_isolation ON agent_executions;
DROP POLICY IF EXISTS agent_conversations_org_isolation ON agent_conversations;
DROP POLICY IF EXISTS agent_messages_via_conversation ON agent_conversation_messages;
DROP POLICY IF EXISTS agent_audit_org_isolation ON agent_audit_log;
DROP POLICY IF EXISTS agent_quotas_org_isolation ON agent_usage_quotas;

-- RLS Policies for agent_executions
-- Users can access executions from their organization
CREATE POLICY agent_executions_org_isolation ON agent_executions
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for agent_conversations
CREATE POLICY agent_conversations_org_isolation ON agent_conversations
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for agent_conversation_messages
CREATE POLICY agent_messages_via_conversation ON agent_conversation_messages
    FOR ALL
    USING (
        conversation_id IN (
            SELECT id FROM agent_conversations WHERE org_id IN (
                SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for agent_audit_log
CREATE POLICY agent_audit_org_isolation ON agent_audit_log
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for agent_usage_quotas
CREATE POLICY agent_quotas_org_isolation ON agent_usage_quotas
    FOR ALL
    USING (
        org_id IN (
            SELECT org_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

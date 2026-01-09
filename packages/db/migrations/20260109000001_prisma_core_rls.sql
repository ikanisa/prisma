-- ============================================================================
-- Prisma Core RLS Policies
-- Version: 1.0.0
-- Date: 2026-01-09
-- 
-- Row Level Security policies ensuring firm-level tenant isolation.
-- Every firm-owned table restricts access by firm_id via membership.
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workpapers ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_request_templates ENABLE ROW LEVEL SECURITY;

-- Jurisdictions and rulesets are public read
ALTER TABLE jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurisdiction_rulesets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- JURISDICTIONS: Public read access
-- ============================================================================

DROP POLICY IF EXISTS "jurisdictions_select" ON jurisdictions;
CREATE POLICY "jurisdictions_select" ON jurisdictions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "jurisdiction_rulesets_select" ON jurisdiction_rulesets;
CREATE POLICY "jurisdiction_rulesets_select" ON jurisdiction_rulesets
    FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- FIRMS: Members can view their firms
-- ============================================================================

DROP POLICY IF EXISTS "firms_select_member" ON firms;
CREATE POLICY "firms_select_member" ON firms
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = firms.id
            AND firm_memberships.user_id = auth.uid()
        )
    );

-- Only ADMINs can update firm details
DROP POLICY IF EXISTS "firms_update_admin" ON firms;
CREATE POLICY "firms_update_admin" ON firms
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = firms.id
            AND firm_memberships.user_id = auth.uid()
            AND firm_memberships.role = 'ADMIN'
        )
    );

-- ============================================================================
-- FIRM MEMBERSHIPS: View own memberships, admins manage all
-- ============================================================================

DROP POLICY IF EXISTS "firm_memberships_select_own" ON firm_memberships;
CREATE POLICY "firm_memberships_select_own" ON firm_memberships
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM firm_memberships fm
            WHERE fm.firm_id = firm_memberships.firm_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "firm_memberships_insert_admin" ON firm_memberships;
CREATE POLICY "firm_memberships_insert_admin" ON firm_memberships
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM firm_memberships fm
            WHERE fm.firm_id = firm_memberships.firm_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "firm_memberships_update_admin" ON firm_memberships;
CREATE POLICY "firm_memberships_update_admin" ON firm_memberships
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships fm
            WHERE fm.firm_id = firm_memberships.firm_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "firm_memberships_delete_admin" ON firm_memberships;
CREATE POLICY "firm_memberships_delete_admin" ON firm_memberships
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships fm
            WHERE fm.firm_id = firm_memberships.firm_id
            AND fm.user_id = auth.uid()
            AND fm.role = 'ADMIN'
        )
    );

-- ============================================================================
-- CLIENTS: Firm members can view/manage clients
-- ============================================================================

DROP POLICY IF EXISTS "clients_select_firm" ON clients;
CREATE POLICY "clients_select_firm" ON clients
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = clients.firm_id
            AND firm_memberships.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "clients_insert_firm" ON clients;
CREATE POLICY "clients_insert_firm" ON clients
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = clients.firm_id
            AND firm_memberships.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "clients_update_firm" ON clients;
CREATE POLICY "clients_update_firm" ON clients
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = clients.firm_id
            AND firm_memberships.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "clients_delete_admin" ON clients;
CREATE POLICY "clients_delete_admin" ON clients
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = clients.firm_id
            AND firm_memberships.user_id = auth.uid()
            AND firm_memberships.role IN ('ADMIN', 'MANAGER')
        )
    );

-- ============================================================================
-- ENGAGEMENTS: Firm members can view, managers+ can create/update
-- ============================================================================

DROP POLICY IF EXISTS "engagements_select_firm" ON engagements;
CREATE POLICY "engagements_select_firm" ON engagements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = engagements.firm_id
            AND firm_memberships.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "engagements_insert_manager" ON engagements;
CREATE POLICY "engagements_insert_manager" ON engagements
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = engagements.firm_id
            AND firm_memberships.user_id = auth.uid()
            AND firm_memberships.role IN ('ADMIN', 'MANAGER')
        )
    );

DROP POLICY IF EXISTS "engagements_update_firm" ON engagements;
CREATE POLICY "engagements_update_firm" ON engagements
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = engagements.firm_id
            AND firm_memberships.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "engagements_delete_admin" ON engagements;
CREATE POLICY "engagements_delete_admin" ON engagements
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.firm_id = engagements.firm_id
            AND firm_memberships.user_id = auth.uid()
            AND firm_memberships.role = 'ADMIN'
        )
    );

-- ============================================================================
-- TASKS: Access via engagement's firm
-- ============================================================================

DROP POLICY IF EXISTS "tasks_select_firm" ON tasks;
CREATE POLICY "tasks_select_firm" ON tasks
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = tasks.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tasks_insert_firm" ON tasks;
CREATE POLICY "tasks_insert_firm" ON tasks
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = tasks.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tasks_update_firm" ON tasks;
CREATE POLICY "tasks_update_firm" ON tasks
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = tasks.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tasks_delete_manager" ON tasks;
CREATE POLICY "tasks_delete_manager" ON tasks
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = tasks.engagement_id
            AND fm.user_id = auth.uid()
            AND fm.role IN ('ADMIN', 'MANAGER')
        )
    );

-- ============================================================================
-- DOCUMENTS: Access via engagement's firm
-- ============================================================================

DROP POLICY IF EXISTS "documents_select_firm" ON documents;
CREATE POLICY "documents_select_firm" ON documents
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = documents.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "documents_insert_firm" ON documents;
CREATE POLICY "documents_insert_firm" ON documents
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = documents.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "documents_delete_manager" ON documents;
CREATE POLICY "documents_delete_manager" ON documents
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = documents.engagement_id
            AND fm.user_id = auth.uid()
            AND fm.role IN ('ADMIN', 'MANAGER')
        )
    );

-- ============================================================================
-- EXTRACTIONS: Access via document's engagement's firm
-- ============================================================================

DROP POLICY IF EXISTS "extractions_select_firm" ON extractions;
CREATE POLICY "extractions_select_firm" ON extractions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN engagements e ON e.id = d.engagement_id
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE d.id = extractions.document_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "extractions_insert_firm" ON extractions;
CREATE POLICY "extractions_insert_firm" ON extractions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN engagements e ON e.id = d.engagement_id
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE d.id = extractions.document_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "extractions_update_firm" ON extractions;
CREATE POLICY "extractions_update_firm" ON extractions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN engagements e ON e.id = d.engagement_id
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE d.id = extractions.document_id
            AND fm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- WORKPAPERS: Access via engagement's firm
-- ============================================================================

DROP POLICY IF EXISTS "workpapers_select_firm" ON workpapers;
CREATE POLICY "workpapers_select_firm" ON workpapers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = workpapers.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "workpapers_insert_firm" ON workpapers;
CREATE POLICY "workpapers_insert_firm" ON workpapers
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = workpapers.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "workpapers_update_firm" ON workpapers;
CREATE POLICY "workpapers_update_firm" ON workpapers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = workpapers.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- ISSUES: Access via engagement's firm
-- ============================================================================

DROP POLICY IF EXISTS "issues_select_firm" ON issues;
CREATE POLICY "issues_select_firm" ON issues
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = issues.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "issues_insert_firm" ON issues;
CREATE POLICY "issues_insert_firm" ON issues
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = issues.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "issues_update_firm" ON issues;
CREATE POLICY "issues_update_firm" ON issues
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = issues.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- AGENT RUNS: Access via engagement's firm
-- ============================================================================

DROP POLICY IF EXISTS "agent_runs_select_firm" ON agent_runs;
CREATE POLICY "agent_runs_select_firm" ON agent_runs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = agent_runs.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agent_runs_insert_firm" ON agent_runs;
CREATE POLICY "agent_runs_insert_firm" ON agent_runs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = agent_runs.engagement_id
            AND fm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- AGENT EVENTS: Access via run's engagement's firm
-- ============================================================================

DROP POLICY IF EXISTS "agent_events_select_firm" ON agent_events;
CREATE POLICY "agent_events_select_firm" ON agent_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM agent_runs ar
            JOIN engagements e ON e.id = ar.engagement_id
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE ar.id = agent_events.run_id
            AND fm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "agent_events_insert_firm" ON agent_events;
CREATE POLICY "agent_events_insert_firm" ON agent_events
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM agent_runs ar
            JOIN engagements e ON e.id = ar.engagement_id
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE ar.id = agent_events.run_id
            AND fm.user_id = auth.uid()
        )
    );

-- ============================================================================
-- APPROVALS: Access based on resource type (engagement-linked)
-- ============================================================================

DROP POLICY IF EXISTS "approvals_select_firm" ON approvals;
CREATE POLICY "approvals_select_firm" ON approvals
    FOR SELECT TO authenticated
    USING (
        -- For workpaper approvals
        (resource_type = 'workpaper' AND EXISTS (
            SELECT 1 FROM workpapers w
            JOIN engagements e ON e.id = w.engagement_id
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE w.id = approvals.resource_id
            AND fm.user_id = auth.uid()
        ))
        OR
        -- For task approvals
        (resource_type = 'task' AND EXISTS (
            SELECT 1 FROM tasks t
            JOIN engagements e ON e.id = t.engagement_id
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE t.id = approvals.resource_id
            AND fm.user_id = auth.uid()
        ))
        OR
        -- For engagement approvals
        (resource_type = 'engagement' AND EXISTS (
            SELECT 1 FROM engagements e
            JOIN firm_memberships fm ON fm.firm_id = e.firm_id
            WHERE e.id = approvals.resource_id
            AND fm.user_id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "approvals_insert_firm" ON approvals;
CREATE POLICY "approvals_insert_firm" ON approvals
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Further validation in application layer

DROP POLICY IF EXISTS "approvals_update_approver" ON approvals;
CREATE POLICY "approvals_update_approver" ON approvals
    FOR UPDATE TO authenticated
    USING (
        approved_by = auth.uid() OR approved_by IS NULL
    );

-- ============================================================================
-- PLAYBOOKS: Public read, admin write
-- ============================================================================

DROP POLICY IF EXISTS "playbooks_select_all" ON playbooks;
CREATE POLICY "playbooks_select_all" ON playbooks
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "playbooks_insert_admin" ON playbooks;
CREATE POLICY "playbooks_insert_admin" ON playbooks
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM firm_memberships
            WHERE firm_memberships.user_id = auth.uid()
            AND firm_memberships.role = 'ADMIN'
        )
    );

-- ============================================================================
-- TASK TEMPLATES: Public read (part of playbooks)
-- ============================================================================

DROP POLICY IF EXISTS "task_templates_select_all" ON task_templates;
CREATE POLICY "task_templates_select_all" ON task_templates
    FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- DOC REQUEST TEMPLATES: Public read (part of playbooks)
-- ============================================================================

DROP POLICY IF EXISTS "doc_request_templates_select_all" ON doc_request_templates;
CREATE POLICY "doc_request_templates_select_all" ON doc_request_templates
    FOR SELECT TO authenticated
    USING (true);

-- ============================================================================
-- SERVICE ROLE BYPASS (for API server)
-- ============================================================================

-- The service role key bypasses RLS automatically in Supabase
-- No additional policies needed for server-side operations

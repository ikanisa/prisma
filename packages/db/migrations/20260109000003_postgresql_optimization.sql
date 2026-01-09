-- ============================================================================
-- PostgreSQL Optimization Migration
-- Version: 1.0.0
-- Date: 2026-01-09
--
-- This migration adds:
-- 1. Table partitioning for agent_events (by month)
-- 2. Composite and partial indexes for hot queries
-- 3. Materialized views for dashboard KPIs
-- 4. Partition maintenance functions
-- ============================================================================

-- ============================================================================
-- PART 1: TABLE PARTITIONING FOR AGENT_EVENTS
-- ============================================================================

-- Step 1: Create partitioned table structure
-- Note: We'll migrate data from the existing agent_events table

-- Create the new partitioned table
CREATE TABLE IF NOT EXISTS agent_events_partitioned (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_order INTEGER NOT NULL DEFAULT 0,
    payload_json JSONB NOT NULL DEFAULT '{}',
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for the current year and next year
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', NOW() - INTERVAL '6 months');
    end_date DATE := DATE_TRUNC('month', NOW() + INTERVAL '12 months');
    partition_date DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
BEGIN
    partition_date := start_date;
    
    WHILE partition_date < end_date LOOP
        partition_name := 'agent_events_' || TO_CHAR(partition_date, 'YYYY_MM');
        partition_start := TO_CHAR(partition_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        -- Check if partition exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE c.relname = partition_name AND n.nspname = 'public'
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF agent_events_partitioned 
                FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_start, partition_end
            );
            
            -- Add index to partition
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON %I (run_id)',
                partition_name || '_run_idx', partition_name
            );
        END IF;
        
        partition_date := partition_date + INTERVAL '1 month';
    END LOOP;
END $$;

-- Create a default partition for any out-of-range data
CREATE TABLE IF NOT EXISTS agent_events_default 
    PARTITION OF agent_events_partitioned DEFAULT;

-- Create indexes on partitioned table
CREATE INDEX IF NOT EXISTS idx_agent_events_part_run 
    ON agent_events_partitioned (run_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_part_type 
    ON agent_events_partitioned (event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_part_order 
    ON agent_events_partitioned (run_id, event_order);
CREATE INDEX IF NOT EXISTS idx_agent_events_part_created 
    ON agent_events_partitioned (created_at);

-- Function to auto-create future partitions
CREATE OR REPLACE FUNCTION create_agent_events_partition()
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    partition_start TEXT;
    partition_end TEXT;
    i INTEGER;
BEGIN
    -- Create partitions for next 3 months
    FOR i IN 0..2 LOOP
        partition_date := DATE_TRUNC('month', NOW()) + (i || ' months')::INTERVAL;
        partition_name := 'agent_events_' || TO_CHAR(partition_date, 'YYYY_MM');
        partition_start := TO_CHAR(partition_date, 'YYYY-MM-DD');
        partition_end := TO_CHAR(partition_date + INTERVAL '1 month', 'YYYY-MM-DD');
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF agent_events_partitioned 
                FOR VALUES FROM (%L) TO (%L)',
                partition_name, partition_start, partition_end
            );
            
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON %I (run_id)',
                partition_name || '_run_idx', partition_name
            );
            
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions (retention policy)
CREATE OR REPLACE FUNCTION drop_old_agent_events_partitions(retention_months INTEGER DEFAULT 12)
RETURNS void AS $$
DECLARE
    cutoff_date DATE := DATE_TRUNC('month', NOW()) - (retention_months || ' months')::INTERVAL;
    partition_record RECORD;
BEGIN
    FOR partition_record IN
        SELECT c.relname AS partition_name
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        JOIN pg_class parent ON parent.oid = i.inhparent
        WHERE parent.relname = 'agent_events_partitioned'
        AND c.relname LIKE 'agent_events_20%'
    LOOP
        -- Extract date from partition name (agent_events_YYYY_MM)
        IF TO_DATE(
            REPLACE(REPLACE(partition_record.partition_name, 'agent_events_', ''), '_', '-') || '-01',
            'YYYY-MM-DD'
        ) < cutoff_date THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
            RAISE NOTICE 'Dropped old partition: %', partition_record.partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: COMPOSITE AND PARTIAL INDEXES
-- ============================================================================

-- Engagements: Hot queries for dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagements_firm_status 
    ON engagements (firm_id, status);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagements_firm_type_status 
    ON engagements (firm_id, type, status);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagements_manager_status 
    ON engagements (manager_id, status) 
    WHERE status IN ('active', 'draft');

-- Partial index for active engagements only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagements_active 
    ON engagements (firm_id, phase, target_completion_date) 
    WHERE status = 'active';

-- Tasks: Hot queries for task lists
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_engagement_status 
    ON tasks (engagement_id, status);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_assigned_status 
    ON tasks (assigned_to, status) 
    WHERE status IN ('pending', 'in_progress');
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_due_status 
    ON tasks (due_date, status) 
    WHERE status NOT IN ('completed', 'blocked');

-- Partial index for overdue tasks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_overdue 
    ON tasks (engagement_id, due_date) 
    WHERE status NOT IN ('completed', 'blocked') 
    AND due_date < NOW();

-- Agent runs: Performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_runs_engagement_started 
    ON agent_runs (engagement_id, started_at DESC);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_runs_status_started 
    ON agent_runs (status, started_at DESC);

-- Partial index for failed runs (for monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_runs_failed 
    ON agent_runs (engagement_id, started_at DESC) 
    WHERE status = 'failed';

-- Workpapers: Review workflow
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workpapers_engagement_status 
    ON workpapers (engagement_id, status);
    
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workpapers_pending_review 
    ON workpapers (reviewed_by, status) 
    WHERE status = 'review';

-- Issues: Audit findings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_issues_engagement_severity 
    ON issues (engagement_id, severity DESC) 
    WHERE status IN ('open', 'in_progress');

-- Clients: Firm lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_firm_segment 
    ON clients (firm_id, client_segment);

-- Documents: Processing queue
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_pending 
    ON documents (engagement_id, uploaded_at) 
    WHERE status IN ('uploaded', 'processing');

-- ============================================================================
-- PART 3: MATERIALIZED VIEWS FOR DASHBOARD KPIs
-- ============================================================================

-- Engagement summary by firm
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_firm_engagement_summary AS
SELECT 
    f.id AS firm_id,
    f.name AS firm_name,
    e.type AS engagement_type,
    COUNT(*) AS total_engagements,
    COUNT(*) FILTER (WHERE e.status = 'active') AS active_engagements,
    COUNT(*) FILTER (WHERE e.status = 'completed') AS completed_engagements,
    COUNT(*) FILTER (WHERE e.phase = 'planning') AS in_planning,
    COUNT(*) FILTER (WHERE e.phase = 'fieldwork') AS in_fieldwork,
    COUNT(*) FILTER (WHERE e.phase = 'completion') AS in_completion,
    AVG(EXTRACT(EPOCH FROM (e.actual_completion_date - e.period_start)) / 86400)::INTEGER AS avg_duration_days
FROM firms f
LEFT JOIN engagements e ON e.firm_id = f.id
GROUP BY f.id, f.name, e.type
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_firm_engagement_summary 
    ON mv_firm_engagement_summary (firm_id, engagement_type);

-- Task completion metrics by engagement
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_engagement_task_metrics AS
SELECT 
    e.id AS engagement_id,
    e.name AS engagement_name,
    e.type AS engagement_type,
    e.status AS engagement_status,
    COUNT(t.id) AS total_tasks,
    COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_tasks,
    COUNT(*) FILTER (WHERE t.status = 'pending') AS pending_tasks,
    COUNT(*) FILTER (WHERE t.status = 'in_progress') AS in_progress_tasks,
    COUNT(*) FILTER (WHERE t.status = 'blocked') AS blocked_tasks,
    COUNT(*) FILTER (WHERE t.due_date < NOW() AND t.status NOT IN ('completed', 'blocked')) AS overdue_tasks,
    ROUND(
        COUNT(*) FILTER (WHERE t.status = 'completed')::NUMERIC / 
        NULLIF(COUNT(t.id), 0) * 100, 1
    ) AS completion_percentage,
    SUM(t.estimated_hours) AS total_estimated_hours,
    SUM(t.actual_hours) AS total_actual_hours
FROM engagements e
LEFT JOIN tasks t ON t.engagement_id = e.id
WHERE e.status IN ('active', 'completed')
GROUP BY e.id, e.name, e.type, e.status
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_engagement_task_metrics 
    ON mv_engagement_task_metrics (engagement_id);

-- Agent performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_agent_performance AS
SELECT 
    DATE_TRUNC('day', ar.started_at) AS run_date,
    ar.agent_type,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE ar.status = 'completed') AS successful_runs,
    COUNT(*) FILTER (WHERE ar.status = 'failed') AS failed_runs,
    ROUND(
        COUNT(*) FILTER (WHERE ar.status = 'completed')::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 1
    ) AS success_rate,
    AVG(EXTRACT(EPOCH FROM (ar.completed_at - ar.started_at)))::INTEGER AS avg_duration_seconds,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ar.completed_at - ar.started_at))) AS p50_duration,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (ar.completed_at - ar.started_at))) AS p95_duration,
    SUM(ar.tokens_input) AS total_tokens_input,
    SUM(ar.tokens_output) AS total_tokens_output
FROM agent_runs ar
WHERE ar.started_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', ar.started_at), ar.agent_type
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_agent_performance 
    ON mv_agent_performance (run_date, agent_type);

-- Issue summary by engagement
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_issue_summary AS
SELECT 
    e.id AS engagement_id,
    e.name AS engagement_name,
    e.firm_id,
    COUNT(i.id) AS total_issues,
    COUNT(*) FILTER (WHERE i.status = 'open') AS open_issues,
    COUNT(*) FILTER (WHERE i.status = 'resolved') AS resolved_issues,
    COUNT(*) FILTER (WHERE i.severity = 'critical') AS critical_issues,
    COUNT(*) FILTER (WHERE i.severity = 'high') AS high_issues,
    COUNT(*) FILTER (WHERE i.severity = 'medium') AS medium_issues,
    COUNT(*) FILTER (WHERE i.severity = 'low') AS low_issues,
    MAX(i.updated_at) AS last_issue_update
FROM engagements e
LEFT JOIN issues i ON i.engagement_id = e.id
GROUP BY e.id, e.name, e.firm_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_issue_summary 
    ON mv_issue_summary (engagement_id);

-- Refresh function for all materialized views
CREATE OR REPLACE FUNCTION refresh_dashboard_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_firm_engagement_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_engagement_task_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_issue_summary;
    
    RAISE NOTICE 'Dashboard materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 4: CONNECTION POOLING RECOMMENDATIONS (COMMENTS)
-- ============================================================================

COMMENT ON FUNCTION refresh_dashboard_views() IS 
'Refreshes all dashboard materialized views. Should be called periodically via cron or pg_cron.
Recommended schedule: Every 5-15 minutes during business hours.

For connection pooling, configure PgBouncer or Supabase connection pooling:
- pool_mode: transaction
- default_pool_size: 20
- max_client_conn: 1000
- Set statement_timeout = 30000 for API queries

Example pg_cron setup:
SELECT cron.schedule(''refresh-views'', ''*/10 * * * *'', ''SELECT refresh_dashboard_views()'');';

-- ============================================================================
-- PART 5: ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================

ANALYZE engagements;
ANALYZE tasks;
ANALYZE agent_runs;
ANALYZE workpapers;
ANALYZE issues;
ANALYZE documents;
ANALYZE clients;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE agent_events_partitioned IS 
'Partitioned version of agent_events table. Partitioned by month for efficient data management and query performance.';

COMMENT ON MATERIALIZED VIEW mv_firm_engagement_summary IS 
'Pre-aggregated engagement counts and status by firm. Refresh periodically.';

COMMENT ON MATERIALIZED VIEW mv_engagement_task_metrics IS 
'Task completion metrics per engagement. Used for engagement progress tracking.';

COMMENT ON MATERIALIZED VIEW mv_agent_performance IS 
'Daily agent performance metrics including success rates and latencies.';

COMMENT ON MATERIALIZED VIEW mv_issue_summary IS 
'Issue counts and severity breakdown by engagement.';

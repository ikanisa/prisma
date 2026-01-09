-- ============================================================================
-- Telemetry Alerts + Autonomy Telemetry Events
-- Version: 1.0.0
-- Date: 2026-01-11
--
-- Adds telemetry_alerts and autonomy_telemetry_events with RLS policies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS telemetry_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT NOT NULL DEFAULT '',
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS telemetry_alerts_org_id_idx ON telemetry_alerts(org_id);
CREATE INDEX IF NOT EXISTS telemetry_alerts_severity_idx ON telemetry_alerts(severity);
CREATE INDEX IF NOT EXISTS telemetry_alerts_created_at_idx ON telemetry_alerts(created_at DESC);

ALTER TABLE telemetry_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telemetry_alerts_select" ON telemetry_alerts;
CREATE POLICY "telemetry_alerts_select" ON telemetry_alerts
    FOR SELECT TO authenticated
    USING (org_id IS NULL OR is_member_of(org_id));

DROP POLICY IF EXISTS "telemetry_alerts_insert" ON telemetry_alerts;
CREATE POLICY "telemetry_alerts_insert" ON telemetry_alerts
    FOR INSERT TO authenticated
    WITH CHECK (org_id IS NULL OR is_member_of(org_id));

DROP POLICY IF EXISTS "telemetry_alerts_update" ON telemetry_alerts;
CREATE POLICY "telemetry_alerts_update" ON telemetry_alerts
    FOR UPDATE TO authenticated
    USING (org_id IS NULL OR is_member_of(org_id))
    WITH CHECK (org_id IS NULL OR is_member_of(org_id));

DROP POLICY IF EXISTS "telemetry_alerts_delete" ON telemetry_alerts;
CREATE POLICY "telemetry_alerts_delete" ON telemetry_alerts
    FOR DELETE TO authenticated
    USING (org_id IS NOT NULL AND has_min_role(org_id, 'MANAGER'));

CREATE TABLE IF NOT EXISTS autonomy_telemetry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module TEXT NOT NULL,
    scenario TEXT NOT NULL,
    decision TEXT NOT NULL DEFAULT 'ALLOWED',
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS autonomy_telemetry_org_id_idx ON autonomy_telemetry_events(org_id);
CREATE INDEX IF NOT EXISTS autonomy_telemetry_module_idx ON autonomy_telemetry_events(module);
CREATE INDEX IF NOT EXISTS autonomy_telemetry_created_at_idx ON autonomy_telemetry_events(created_at DESC);

ALTER TABLE autonomy_telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "autonomy_telemetry_events_select" ON autonomy_telemetry_events;
CREATE POLICY "autonomy_telemetry_events_select" ON autonomy_telemetry_events
    FOR SELECT TO authenticated
    USING (is_member_of(org_id));

DROP POLICY IF EXISTS "autonomy_telemetry_events_insert" ON autonomy_telemetry_events;
CREATE POLICY "autonomy_telemetry_events_insert" ON autonomy_telemetry_events
    FOR INSERT TO authenticated
    WITH CHECK (is_member_of(org_id));

DROP POLICY IF EXISTS "autonomy_telemetry_events_update" ON autonomy_telemetry_events;
CREATE POLICY "autonomy_telemetry_events_update" ON autonomy_telemetry_events
    FOR UPDATE TO authenticated
    USING (is_member_of(org_id))
    WITH CHECK (is_member_of(org_id));

DROP POLICY IF EXISTS "autonomy_telemetry_events_delete" ON autonomy_telemetry_events;
CREATE POLICY "autonomy_telemetry_events_delete" ON autonomy_telemetry_events
    FOR DELETE TO authenticated
    USING (has_min_role(org_id, 'MANAGER'));

-- Prisma Core Database Cleanup Migration
-- Drops deprecated tables from pre-refactor schema
-- Date: 2026-01-09
-- Purpose: Remove US overlays, corporate services, and learning system tables

-- =============================================================================
-- DROP DEPRECATED TABLES
-- =============================================================================

-- US Overlays (out of scope - US jurisdiction removed)
DROP TABLE IF EXISTS tax_us_overlays CASCADE;
DROP TABLE IF EXISTS us_overlay_configs CASCADE;

-- Corporate Services (out of scope - corporate services removed)
DROP TABLE IF EXISTS corporate_formations CASCADE;
DROP TABLE IF EXISTS corporate_services CASCADE;
DROP TABLE IF EXISTS corp_malta_entities CASCADE;

-- Learning System (deprecated)
DROP TABLE IF EXISTS agent_learning_feedback CASCADE;
DROP TABLE IF EXISTS agent_learning_sessions CASCADE;
DROP TABLE IF EXISTS agent_learning_metrics CASCADE;

-- Debug/Development Tables (not for production)
DROP TABLE IF EXISTS openai_debug_events CASCADE;
DROP TABLE IF EXISTS debug_logs CASCADE;

-- Multi-agent Orchestration (simplified to single agent)
DROP TABLE IF EXISTS orchestration_runs CASCADE;
DROP TABLE IF EXISTS orchestration_steps CASCADE;
DROP TABLE IF EXISTS multi_agent_sessions CASCADE;

-- Web Fetch Cache (simplified)
DROP TABLE IF EXISTS web_fetch_cache CASCADE;
DROP TABLE IF EXISTS crawl_jobs CASCADE;

-- =============================================================================
-- DROP DEPRECATED FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS check_us_overlay_eligibility CASCADE;
DROP FUNCTION IF EXISTS process_corporate_formation CASCADE;
DROP FUNCTION IF EXISTS log_agent_learning CASCADE;

-- =============================================================================
-- DROP DEPRECATED ENUMS (if not in use)
-- =============================================================================

-- Note: Only drop if no columns reference these enums
-- DO $$ BEGIN
--     DROP TYPE IF EXISTS us_state_code;
--     DROP TYPE IF EXISTS corporate_entity_type;
-- EXCEPTION WHEN dependent_objects_still_exist THEN
--     NULL; -- Ignore if in use
-- END $$;

-- =============================================================================
-- VERIFY CLEANUP
-- =============================================================================

-- Check remaining tables (should only have Prisma Core tables)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

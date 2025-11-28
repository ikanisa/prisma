-- Phase 2 security hardening: remove write access granted to the PUBLIC role

BEGIN;

DO $$
DECLARE
    revoke_stmt text;
BEGIN
    FOR revoke_stmt IN
        SELECT format('REVOKE INSERT, UPDATE, DELETE ON TABLE %I.%I FROM PUBLIC;', schemaname, tablename)
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE revoke_stmt;
    END LOOP;
END;
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM PUBLIC;

COMMIT;

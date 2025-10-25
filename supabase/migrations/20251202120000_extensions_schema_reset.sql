-- Move extension-managed objects into the dedicated `extensions` schema.
-- Ensures pgcrypto/vector/btree_gin/pg_trgm live outside `public` to avoid
-- future search_path surprises.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
DECLARE
  ext_name text;
  ext_record record;
  target_schema constant text := 'extensions';
BEGIN
  FOR ext_name IN
    SELECT unnest(ARRAY['pgcrypto', 'vector', 'btree_gin', 'pg_trgm'])
  LOOP
    SELECT
      e.extname,
      n.nspname AS current_schema,
      e.extversion
    INTO ext_record
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = ext_name;

    IF NOT FOUND THEN
      EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I WITH SCHEMA %I', ext_name, target_schema);
      CONTINUE;
    END IF;

    IF ext_record.current_schema = target_schema THEN
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format('DROP EXTENSION %I', ext_name);
      EXECUTE format(
        'CREATE EXTENSION %I WITH SCHEMA %I VERSION %L',
        ext_name,
        target_schema,
        ext_record.extversion
      );
    EXCEPTION
      WHEN others THEN
        RAISE NOTICE 'Recreating extension % failed (%). Falling back to ALTER.', ext_name, SQLERRM;

        IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = ext_name) THEN
          EXECUTE format('CREATE EXTENSION IF NOT EXISTS %I WITH SCHEMA %I', ext_name, target_schema);
        END IF;

        IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = ext_name) THEN
          EXECUTE format('ALTER EXTENSION %I SET SCHEMA %I', ext_name, target_schema);
        ELSE
          RAISE;
        END IF;
    END;
  END LOOP;
END
$$;

COMMIT;

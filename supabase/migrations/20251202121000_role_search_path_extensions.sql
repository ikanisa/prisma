-- Ensure core Supabase roles resolve functions from the `extensions` schema.

BEGIN;

DO $$
DECLARE
  role_name text;
  current_path text;
  final_paths text[];
  entry text;
  required text[] := ARRAY['app', 'public', 'auth'];
BEGIN
  FOR role_name IN
    SELECT unnest(ARRAY[
      'postgres',
      'supabase_admin',
      'supabase_auth_admin',
      'supabase_storage_admin',
      'authenticator',
      'service_role',
      'authenticated',
      'anon'
    ])
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      SELECT
        split_part(config, '=', 2)
      INTO current_path
      FROM pg_roles r
      CROSS JOIN LATERAL unnest(COALESCE(r.rolconfig, ARRAY[]::text[])) AS config
      WHERE r.rolname = role_name
        AND config LIKE 'search_path=%'
      LIMIT 1;

      final_paths := ARRAY['extensions'];

      IF current_path IS NOT NULL THEN
        FOR entry IN
          SELECT trim(both FROM value)
          FROM unnest(string_to_array(current_path, ',')) AS value
        LOOP
          IF entry <> '' AND NOT final_paths @> ARRAY[entry] THEN
            final_paths := final_paths || entry;
          END IF;
        END LOOP;
      END IF;

      FOREACH entry IN ARRAY required LOOP
        IF NOT final_paths @> ARRAY[entry] THEN
          final_paths := final_paths || entry;
        END IF;
      END LOOP;

      EXECUTE format('ALTER ROLE %I SET search_path TO %s', role_name, array_to_string(final_paths, ', '));
    END IF;
  END LOOP;
END
$$;

COMMIT;

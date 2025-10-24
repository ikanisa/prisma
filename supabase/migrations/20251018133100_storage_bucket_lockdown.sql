-- Phase 1 stabilization: ensure pay/documents storage buckets are private with restrictive policies

BEGIN;

DO $$
BEGIN
  IF NOT pg_has_role(current_user, 'supabase_storage_admin', 'USAGE') THEN
    RAISE NOTICE 'Skipping storage bucket lockdown; run this script as supabase_storage_admin via Supabase SQL editor.';
    RETURN;
  END IF;

  -- Ensure buckets exist and remain private
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('pay', 'pay', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

  UPDATE storage.buckets
  SET public = false
  WHERE id IN ('documents', 'pay');

  -- Enforce RLS on storage objects
  EXECUTE 'ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY';

  -- Documents bucket policies (service role manage, members read)
  EXECUTE 'DROP POLICY IF EXISTS documents_service_role_manage ON storage.objects';
  EXECUTE $policy$
    CREATE POLICY documents_service_role_manage ON storage.objects
      FOR ALL
      USING (bucket_id = 'documents' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'documents' AND auth.role() = 'service_role');
  $policy$;

  EXECUTE 'DROP POLICY IF EXISTS documents_member_select ON storage.objects';
  EXECUTE $policy$
    CREATE POLICY documents_member_select ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'documents'
        AND (
          auth.role() = 'service_role'
          OR (
            auth.role() = 'authenticated'
            AND substring(split_part(storage.objects.name, '/', 1) from '^org-([0-9a-fA-F-]+)$') IS NOT NULL
            AND public.is_member_of(
              (substring(split_part(storage.objects.name, '/', 1) from '^org-([0-9a-fA-F-]+)$'))::uuid
            )
          )
        )
      );
  $policy$;

  -- Pay bucket policies (service role only)
  EXECUTE 'DROP POLICY IF EXISTS pay_service_role_manage ON storage.objects';
  EXECUTE $policy$
    CREATE POLICY pay_service_role_manage ON storage.objects
      FOR ALL
      USING (bucket_id = 'pay' AND auth.role() = 'service_role')
      WITH CHECK (bucket_id = 'pay' AND auth.role() = 'service_role');
  $policy$;
END;
$$;

COMMIT;

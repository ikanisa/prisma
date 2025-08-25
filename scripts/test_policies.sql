-- pgTAP tests for RLS policies
BEGIN;
SELECT plan(3);

-- RLS should be enabled on users
SELECT ok(
    (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.users'::regclass),
    'RLS enabled on users table'
);

-- users_select_self policy should exist
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
          AND policyname = 'users_select_self'
    ),
    'users_select_self policy exists'
);

-- users_admin_manage policy should exist
SELECT ok(
    EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'users'
          AND policyname = 'users_admin_manage'
    ),
    'users_admin_manage policy exists'
);

SELECT * FROM finish();
ROLLBACK;

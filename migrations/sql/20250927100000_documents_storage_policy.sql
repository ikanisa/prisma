-- Enforce private storage access for documents bucket
set check_function_bodies = off;

-- The Supabase CLI connects as `postgres`, which lacks privileges to alter
-- `storage.objects`. Run this script via the Supabase SQL editor (role
-- `supabase_storage_admin`) to apply the policies. When the current role does
-- not have the required membership the block below no-ops and emits a notice so
-- automated pushes proceed without failing.
do $$
begin
  if not pg_has_role(current_user, 'supabase_storage_admin', 'USAGE') then
    raise notice 'Skipping documents storage policy migration; run this script as supabase_storage_admin via Supabase SQL editor.';
    return;
  end if;

  execute 'alter table if exists storage.objects enable row level security';

  execute 'drop policy if exists documents_service_role_manage on storage.objects';
  execute 'create policy documents_service_role_manage on storage.objects
    for all
    using (bucket_id = ''documents'' and auth.role() = ''service_role'')
    with check (bucket_id = ''documents'' and auth.role() = ''service_role'')';

  execute 'drop policy if exists documents_member_select on storage.objects';
  execute 'create policy documents_member_select on storage.objects
    for select
    using (
      bucket_id = ''documents''
      and (
        auth.role() = ''service_role''
        or (
          auth.role() = ''authenticated''
          and substring(split_part(storage.objects.name, ''/'', 1) from ''^org-([0-9a-fA-F-]+)$'') is not null
          and public.is_member_of(
            (substring(split_part(storage.objects.name, ''/'', 1) from ''^org-([0-9a-fA-F-]+)$''))::uuid
          )
        )
      )
    )';

  execute 'comment on policy documents_service_role_manage on storage.objects is
    ''Allow only service role consumers to write to the documents bucket.''';

  execute 'comment on policy documents_member_select on storage.objects is
    ''Authenticated users may read objects from the documents bucket when they belong to the owning organisation.''';
end;
$$;

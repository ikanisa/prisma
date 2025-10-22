-- Harden activity_event_catalog with RLS policies (SEC-104)
set check_function_bodies = off;

alter table if exists public.activity_event_catalog enable row level security;

drop policy if exists activity_event_catalog_read on public.activity_event_catalog;
create policy activity_event_catalog_read on public.activity_event_catalog
  for select using (auth.uid() is not null);

drop policy if exists activity_event_catalog_manage on public.activity_event_catalog;
create policy activity_event_catalog_manage on public.activity_event_catalog
  for all
  using (false)
  with check (false);

comment on policy activity_event_catalog_read on public.activity_event_catalog is
  'Allow authenticated principals to read reference data while preventing anonymous access.';

comment on policy activity_event_catalog_manage on public.activity_event_catalog is
  'Disallow direct mutations; catalog is managed via migrations and service role.';


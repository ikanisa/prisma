-- Universal enum of things a user can "serve" (i.e., already contacted)
create type if not exists public.match_kind as enum ('driver','passenger','business');

-- New universal served table (idempotent)
create table if not exists public.served_matches (
  id bigserial primary key,
  viewer_msisdn text not null,             -- E.164 of the viewer (e.g. +2507...)
  kind public.match_kind not null,
  target_pk text not null,                 -- the primary key of the target as TEXT
  served_at timestamptz not null default now(),
  unique(viewer_msisdn, kind, target_pk)
);

-- If an older "served_matches" exists with a mismatched column, try to migrate it
do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='served_matches' and column_name='target_id'
  ) then
    -- Backfill new text column from old numeric/uuid column
    if not exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='served_matches' and column_name='target_pk'
    ) then
      alter table public.served_matches add column target_pk text;
    end if;

    update public.served_matches set target_pk = target_id::text where target_pk is null;

    -- Remove the bad column to avoid future operator errors
    alter table public.served_matches drop column target_id;
  end if;
end$$;

-- RLS (deny all)
alter table public.served_matches enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='served_matches') then
    create policy no_public_served on public.served_matches for all using (false);
  end if;
end$$;

-- Helper to mark as served
create or replace function public.mark_served(_viewer text, _kind public.match_kind, _target_pk text)
returns void language sql as $$
  insert into public.served_matches(viewer_msisdn, kind, target_pk)
  values (_viewer, _kind, _target_pk)
  on conflict (viewer_msisdn, kind, target_pk) do nothing;
$$;

-- Add missing columns safely
alter table public.businesses
  add column if not exists description text,
  add column if not exists is_active boolean not null default true,
  add column if not exists geo geography(Point,4326);

-- Backfill geo from legacy "location" if present and geo is null
do $$
begin
  if exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='businesses' and column_name='location'
  ) then
    update public.businesses
      set geo = (case when geo is null then location else geo end)
      where true;
  end if;
end$$;

-- Indexes (idempotent)
create index if not exists idx_businesses_geo on public.businesses using gist(geo);
create index if not exists idx_businesses_created on public.businesses(created_at);

-- RLS lockdown if not already present
alter table public.businesses enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses') then
    create policy no_public_businesses on public.businesses for all using (false);
  end if;
end$$;

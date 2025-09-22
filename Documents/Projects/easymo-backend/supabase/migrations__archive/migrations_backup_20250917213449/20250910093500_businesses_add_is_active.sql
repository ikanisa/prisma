-- Ensure columns the core pack expects
alter table public.businesses
  add column if not exists is_active boolean not null default true,
  add column if not exists description text;

-- Ensure spatial index exists (safe if already present)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public'
      and tablename='businesses'
      and indexname='idx_businesses_geo'
  ) then
    execute 'create index idx_businesses_geo on public.businesses using gist(geo)';
  end if;
end$$;

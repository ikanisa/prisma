create extension if not exists pgcrypto;

create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.marketplace_categories enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='marketplace_categories'
  ) then
    create policy deny_all_marketplace_categories
      on public.marketplace_categories for all using (false);
  end if;
end$$;

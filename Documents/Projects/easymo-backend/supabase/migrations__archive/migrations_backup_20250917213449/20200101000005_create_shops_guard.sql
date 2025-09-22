-- Ensure pgcrypto for gen_random_uuid (safe if already exists)
create extension if not exists pgcrypto with schema public;

-- Create shops table (idempotent)
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Keep this unique; idempotent if it already exists
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'shops_short_code_key'
      and conrelid = 'public.shops'::regclass
  ) then
    alter table public.shops add constraint shops_short_code_key unique (short_code);
  end if;
end $$;

-- Optional: a default row so later scripts that expect at least one shop don't fail
insert into public.shops (name, short_code, is_active)
values ('Default Shop', 'DEFAULT', true)
on conflict (short_code) do nothing;

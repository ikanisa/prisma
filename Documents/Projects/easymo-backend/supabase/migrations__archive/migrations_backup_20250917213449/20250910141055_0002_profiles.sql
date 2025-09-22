create table if not exists public.profiles (
  user_id uuid primary key default gen_random_uuid(),
  whatsapp_e164 text unique not null,  -- like +2507XXXXXXXX
  display_name text,
  locale text default 'rw',
  is_admin boolean default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles'
  ) then
    create policy deny_all_profiles on public.profiles for all using (false);
  end if;
end$$;

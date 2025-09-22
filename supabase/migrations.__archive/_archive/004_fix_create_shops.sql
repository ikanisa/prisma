-- Create the shops table (idempotent)
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text unique not null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Lock it down (RLS deny-all) so only Edge Functions (service role) can use it
alter table public.shops enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='shops') then
    create policy no_public_shops on public.shops for all using (false);
  end if;
end$$;

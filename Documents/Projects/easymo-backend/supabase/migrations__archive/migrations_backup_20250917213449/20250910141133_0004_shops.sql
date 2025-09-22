create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- lock it down (Edge Functions use service role)
alter table public.shops enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='shops'
  ) then
    create policy deny_all_shops on public.shops for all using (false);
  end if;
end$$;

drop table if exists public.idempotency_keys cascade;

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  resource text not null,
  idempotency_key text not null,
  request_id text,
  status_code integer not null,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idempotency_keys_unique
  on public.idempotency_keys (org_id, resource, idempotency_key);

alter table public.idempotency_keys enable row level security;

drop policy if exists "Allow service role idempotency access" on public.idempotency_keys;
create policy "Allow service role idempotency access"
  on public.idempotency_keys
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

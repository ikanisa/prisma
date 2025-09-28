create table if not exists public.rate_limits (
  org_id uuid not null,
  resource text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (org_id, resource, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

create or replace function public.enforce_rate_limit(
  p_org_id uuid,
  p_resource text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, request_count integer)
language plpgsql
as $$
declare
  v_window_start timestamptz := date_trunc('second', now()) - make_interval(secs => mod(extract(epoch from now())::integer, p_window_seconds));
  v_count integer;
begin
  insert into public.rate_limits(org_id, resource, window_start, request_count)
  values (p_org_id, p_resource, v_window_start, 1)
  on conflict (org_id, resource, window_start)
  do update set request_count = public.rate_limits.request_count + 1
  returning request_count into v_count;

  return query select (v_count <= p_limit) as allowed, v_count;
end;
$$;

alter table public.rate_limits enable row level security;

create policy if not exists "Service role rate limits"
  on public.rate_limits
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

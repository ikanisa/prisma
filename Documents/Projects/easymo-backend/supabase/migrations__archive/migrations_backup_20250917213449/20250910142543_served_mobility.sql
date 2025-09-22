-- Drivers served to *passenger* viewers
create table if not exists public.served_drivers (
  viewer_passenger_msisdn text not null,
  driver_contact_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_passenger_msisdn, driver_contact_id)
);
alter table public.served_drivers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='served_drivers') then
    create policy deny_all on public.served_drivers for all using (false);
  end if;
end $$;

-- Passengers served to *driver* viewers
create table if not exists public.served_passengers (
  viewer_driver_msisdn text not null,
  passenger_trip_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (viewer_driver_msisdn, passenger_trip_id)
);
alter table public.served_passengers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='served_passengers') then
    create policy deny_all on public.served_passengers for all using (false);
  end if;
end $$;

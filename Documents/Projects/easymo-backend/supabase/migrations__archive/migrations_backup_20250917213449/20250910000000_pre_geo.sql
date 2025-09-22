-- Ensure the geography columns exist before indexes are created

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- businesses.geo
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='businesses' and column_name='geo'
  ) then
    alter table public.businesses add column geo geography(Point,4326);
  end if;
end$$;

-- drivers.geo (and helper columns)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='drivers') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='drivers' and column_name='geo') then
      alter table public.drivers add column geo geography(Point,4326);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='drivers' and column_name='vehicle_type') then
      alter table public.drivers add column vehicle_type text default 'any';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='drivers' and column_name='is_available') then
      alter table public.drivers add column is_available boolean default true;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='drivers' and column_name='last_seen') then
      alter table public.drivers add column last_seen timestamptz default now();
    end if;
  end if;
end$$;

-- passenger_trips.pickup/dest
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='passenger_trips') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='passenger_trips' and column_name='pickup') then
      alter table public.passenger_trips add column pickup geography(Point,4326);
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='passenger_trips' and column_name='dest') then
      alter table public.passenger_trips add column dest geography(Point,4326);
    end if;
  end if;
end$$;

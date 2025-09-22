-- ===== Extensions
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ===== Idempotency for inbound WA messages (avoid double sends)
create table if not exists public.wa_inbound (
  wa_msg_id text primary key,
  from_msisdn text,
  received_at timestamptz default now()
);

-- ===== Chat sessions (per WhatsApp number)
create table if not exists public.chat_sessions (
  user_id text primary key,       -- E.164 WhatsApp number
  state jsonb,
  updated_at timestamptz default now()
);

-- ===== Insurance leads (if your 003 already made it, this is a no-op)
create table if not exists public.insurance_leads (
  id uuid primary key default gen_random_uuid(),
  whatsapp text not null,
  file_path text,
  raw_ocr jsonb,
  extracted jsonb,
  created_at timestamptz default now()
);

-- ===== Businesses (Marketplace)
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_whatsapp text not null,
  name text not null,
  description text,
  -- geography(POINT,4326) for distance queries
  geo geography(Point,4326),
  is_active boolean not null default true,
  created_at timestamptz default now()
);
-- required columns in case table exists from older schema
alter table public.businesses
  add column if not exists description text,
  add column if not exists is_active boolean not null default true;
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname='public'
    and tablename='businesses' and indexname='idx_businesses_geo'
  ) then
    execute 'create index idx_businesses_geo on public.businesses using gist(geo)';
  end if;
end$$;

-- ===== Rides: available drivers & passenger requests
create table if not exists public.drivers_available (
  id uuid primary key default gen_random_uuid(),
  whatsapp text not null,
  vehicle_type text,                         -- "moto" | "car" | "van" | etc.
  geo geography(Point,4326),
  served_at timestamptz,
  served_by text,
  created_at timestamptz default now()
);
create index if not exists idx_drivers_geo on public.drivers_available using gist(geo);

create table if not exists public.passengers_requests (
  id uuid primary key default gen_random_uuid(),
  whatsapp text not null,
  vehicle_type text,
  geo geography(Point,4326),
  served_at timestamptz,
  served_by text,
  created_at timestamptz default now()
);
create index if not exists idx_passengers_geo on public.passengers_requests using gist(geo);

-- ===== Helper: km(a,b) in kilometers
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select round((st_distance(a,b) / 1000.0)::numeric, 2)
$$;

-- ===== Nearby queries with distance + served filtering
create or replace function public.nearby_businesses(_lat double precision, _lon double precision, _limit int)
returns table(id bigint, name text, description text, distance_km numeric) language sql stable as $$
  select b.id, b.name, coalesce(b.description,''), km(
    b.geo, st_setsrid(st_point(_lon,_lat),4326)::geography
  ) as distance_km
  from public.businesses b
  where b.is_active = true and b.geo is not null
  order by b.created_at desc, km(
    b.geo, st_setsrid(st_point(_lon,_lat),4326)::geography
  ) asc
  limit greatest(_limit,1)
$$;

create or replace function public.nearby_drivers(_lat double precision, _lon double precision, _viewer text, _limit int, _vehicle text)
returns table(id uuid, whatsapp text, distance_km numeric) language sql stable as $$
  select d.id, d.whatsapp, km(
    d.geo, st_setsrid(st_point(_lon,_lat),4326)::geography
  ) as distance_km
  from public.drivers_available d
  where d.geo is not null
    and d.served_at is null
    and (_vehicle is null or d.vehicle_type = _vehicle)
  order by d.created_at desc, km(
    d.geo, st_setsrid(st_point(_lon,_lat),4326)::geography
  ) asc
  limit greatest(_limit,1)
$$;

create or replace function public.nearby_passengers(_lat double precision, _lon double precision, _viewer text, _limit int, _vehicle text)
returns table(id uuid, whatsapp text, distance_km numeric) language sql stable as $$
  select p.id, p.whatsapp, km(
    p.geo, st_setsrid(st_point(_lon,_lat),4326)::geography
  ) as distance_km
  from public.passengers_requests p
  where p.geo is not null
    and p.served_at is null
    and (_vehicle is null or p.vehicle_type = _vehicle)
  order by p.created_at desc, km(
    p.geo, st_setsrid(st_point(_lon,_lat),4326)::geography
  ) asc
  limit greatest(_limit,1)
$$;

-- Deny-all RLS (edge function uses service role)
alter table public.wa_inbound enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.insurance_leads enable row level security;
alter table public.businesses enable row level security;
alter table public.drivers_available enable row level security;
alter table public.passengers_requests enable row level security;

do $$
begin
  perform 1 from pg_policies where tablename='wa_inbound';
  if not found then create policy deny_all_wa_in on public.wa_inbound for all using (false); end if;

  perform 1 from pg_policies where tablename='chat_sessions';
  if not found then create policy deny_all_cs on public.chat_sessions for all using (false); end if;

  perform 1 from pg_policies where tablename='insurance_leads';
  if not found then create policy deny_all_il on public.insurance_leads for all using (false); end if;

  perform 1 from pg_policies where tablename='businesses';
  if not found then create policy deny_all_biz on public.businesses for all using (false); end if;

  perform 1 from pg_policies where tablename='drivers_available';
  if not found then create policy deny_all_drv on public.drivers_available for all using (false); end if;

  perform 1 from pg_policies where tablename='passengers_requests';
  if not found then create policy deny_all_psg on public.passengers_requests for all using (false); end if;
end$$;

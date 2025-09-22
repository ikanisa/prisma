-- Extensions
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- Core tables (idempotent)
create table if not exists profiles (
  user_id uuid primary key default gen_random_uuid(),
  whatsapp_e164 text unique not null,
  ref_code char(6) unique not null,
  credits_balance integer default 10,
  created_at timestamptz default now()
);

create table if not exists driver_status (
  user_id uuid primary key references profiles(user_id) on delete cascade,
  vehicle_type text check (vehicle_type in ('moto','cab','lifan','truck','others')),
  location geography(Point, 4326),
  last_seen timestamptz default now(),
  online boolean default false
);
create index if not exists idx_driver_status_loc on driver_status using gist (location);
create index if not exists idx_driver_status_last_seen on driver_status (last_seen);

create table if not exists trips (
  id bigserial primary key,
  creator_user_id uuid not null references profiles(user_id) on delete cascade,
  role text check (role in ('passenger','driver')) not null,
  vehicle_type text check (vehicle_type in ('moto','cab','lifan','truck','others')) not null,
  pickup geography(Point,4326) not null,
  status text default 'open',
  created_at timestamptz default now()
);
create index if not exists idx_trips_pickup on trips using gist (pickup);
create index if not exists idx_trips_created on trips (created_at);

-- enum: create only if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sub_status') THEN
    CREATE TYPE sub_status AS ENUM ('pending_review','active','expired','rejected');
  END IF;
END$$;

create table if not exists subscriptions (
  id bigserial primary key,
  user_id uuid not null references profiles(user_id) on delete cascade,
  status sub_status not null default 'pending_review',
  started_at timestamptz,
  expires_at timestamptz,
  amount integer not null default 5000,
  proof_url text,
  txn_id text,
  created_at timestamptz default now()
);
create index if not exists idx_sub_user on subscriptions (user_id);
create index if not exists idx_sub_expiry on subscriptions (expires_at);

create table if not exists app_config (
  id boolean primary key default true,
  subscription_price integer default 5000,
  search_radius_km numeric default 5.0,
  max_results integer default 10,
  momo_payee_number text,
  support_phone_e164 text,
  admin_whatsapp_numbers text,
  pro_enabled boolean not null default false
);
insert into app_config(id) values(true) on conflict do nothing;

create table if not exists chat_state (
  user_id uuid primary key references profiles(user_id) on delete cascade,
  state text,
  data jsonb,
  updated_at timestamptz default now()
);

create table if not exists wa_events (
  wa_message_id text primary key,
  received_at timestamptz default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  user_id uuid,
  event text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists credit_events (
  id bigserial primary key,
  user_id uuid not null references profiles(user_id) on delete cascade,
  action text not null,
  used_credit boolean not null,
  created_at timestamptz default now()
);

-- RLS: deny-all
alter table profiles enable row level security;
alter table driver_status enable row level security;
alter table trips enable row level security;
alter table subscriptions enable row level security;
alter table app_config enable row level security;
alter table chat_state enable row level security;
alter table wa_events enable row level security;
alter table audit_logs enable row level security;
alter table credit_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles') then
    create policy no_public_profiles on profiles for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='driver_status') then
    create policy no_public_driver_status on driver_status for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trips') then
    create policy no_public_trips on trips for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions') then
    create policy no_public_subs on subscriptions for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='app_config') then
    create policy no_public_config on app_config for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chat_state') then
    create policy no_public_chatstate on chat_state for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wa_events') then
    create policy no_public_waevents on wa_events for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs') then
    create policy no_public_audit on audit_logs for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='credit_events') then
    create policy no_public_creditev on credit_events for all using (false);
  end if;
end$$;

-- 🔧 Drop old RPCs (so we can change their return types safely)
DROP FUNCTION IF EXISTS public.recent_drivers_near(double precision,double precision,text,numeric,integer);
DROP FUNCTION IF EXISTS public.recent_passenger_trips_near(double precision,double precision,text,numeric,integer);

-- Nearby RPCs (vehicle_type optional via NULL)
create or replace function recent_drivers_near(
  in_lat double precision, in_lng double precision,
  in_vehicle_type text, in_radius_km numeric, in_max integer
) returns table (ref_code char(6), whatsapp_e164 text, last_seen timestamptz, user_id uuid)
language sql stable as $$
  select p.ref_code, p.whatsapp_e164, d.last_seen, d.user_id
  from driver_status d
  join profiles p on p.user_id = d.user_id
  where d.online = true
    and (in_vehicle_type is null or d.vehicle_type = in_vehicle_type)
    and d.location is not null
    and st_dwithin(d.location::geography,
                   st_setsrid(st_makepoint(in_lng, in_lat),4326),
                   in_radius_km * 1000)
  order by d.last_seen desc
  limit greatest(in_max,1);
$$;

create or replace function recent_passenger_trips_near(
  in_lat double precision, in_lng double precision,
  in_vehicle_type text, in_radius_km numeric, in_max integer
) returns table (trip_id bigint, creator_user_id uuid, created_at timestamptz)
language sql stable as $$
  select t.id, t.creator_user_id, t.created_at
  from trips t
  where t.role='passenger' and t.status='open'
    and (in_vehicle_type is null or t.vehicle_type=in_vehicle_type)
    and st_dwithin(t.pickup::geography,
                   st_setsrid(st_makepoint(in_lng, in_lat),4326),
                   in_radius_km * 1000)
  order by t.created_at desc
  limit greatest(in_max,1);
$$;

-- Pro gate (unchanged)
create or replace function gate_pro_feature(_user_id uuid)
returns table(access boolean, used_credit boolean, credits_left integer)
language plpgsql security definer as $$
declare v_active_sub boolean;
begin
  select exists(
    select 1 from subscriptions s
    where s.user_id=_user_id
      and s.status='active'
      and coalesce(s.expires_at, now()) > now()
  ) into v_active_sub;

  if v_active_sub then
    return query
      select true, false, (select credits_balance from profiles where user_id=_user_id);
  else
    update profiles
       set credits_balance = credits_balance - 1
     where user_id=_user_id and credits_balance > 0
     returning true, true, credits_balance
      into access, used_credit, credits_left;

    if not found then
      return query
        select false, false, (select credits_balance from profiles where user_id=_user_id);
    else
      return;
    end if;
  end if;
end$$;

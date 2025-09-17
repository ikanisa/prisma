-- === Extensions ===
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- ===== Simple helper: phone normalizer (keeps digits only) =====
create or replace function public.norm_msisdn(txt text)
returns text language sql immutable as $$
  select regexp_replace(txt, '\D', '', 'g')
$$;

-- ===================== MARKETPLACE / NEARBY =====================
-- Businesses a user can add and others can discover
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_msisdn text not null,
  name text not null,
  description text,
  category text,
  geo geography(point, 4326), -- lon/lat
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_businesses_geo on public.businesses using gist(geo);

-- Track who was already "served" (so we don't show again)
create table if not exists public.served_matches (
  id bigserial primary key,
  viewer_msisdn text not null,
  kind text not null check (kind in ('driver','passenger','business')),
  target_id uuid not null,
  created_at timestamptz default now()
);

-- Drivers "online" + last location
create table if not exists public.drivers (
  msisdn text primary key,
  vehicle_type text default 'any',
  geo geography(point,4326),
  is_available boolean default true,
  last_seen timestamptz default now()
);
create index if not exists idx_drivers_geo on public.drivers using gist(geo);

-- Passenger trip requests (pickup + optional dest)
create table if not exists public.passenger_trips (
  id uuid primary key default gen_random_uuid(),
  rider_msisdn text not null,
  vehicle_type text default 'any',
  pickup geography(point,4326) not null,
  dest geography(point,4326),
  status text not null default 'open', -- open | matched | closed
  created_at timestamptz default now()
);
create index if not exists idx_passenger_trips_pickup on public.passenger_trips using gist(pickup);

-- Distance helper (km)
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select round(st_distance(a,b)::numeric / 1000, 2)
$$;

-- Nearby businesses by viewer location, excluding already-served
create or replace function public.nearby_businesses(_lat double precision, _lon double precision, _viewer text, _limit int)
returns table(id uuid, name text, description text, distance_km numeric) language sql stable as $$
  select b.id, b.name, coalesce(b.description,''), km(b.geo, st_setsrid(st_point(_lon,_lat),4326)::geography) as distance_km
  from public.businesses b
  where b.is_active = true
    and b.geo is not null
    and not exists (
      select 1 from public.served_matches sm
       where sm.viewer_msisdn = _viewer and sm.kind='business' and sm.target_id=b.id
    )
  order by b.created_at desc, distance_km asc
  limit coalesce(_limit, 10)
$$;

-- Nearby open passenger trips (for drivers)
create or replace function public.nearby_passengers(_lat double precision, _lon double precision, _viewer text, _limit int, _vehicle text)
returns table(id uuid, rider_msisdn text, distance_km numeric, vehicle_type text) language sql stable as $$
  select t.id, t.rider_msisdn,
         km(t.pickup, st_setsrid(st_point(_lon,_lat),4326)::geography) as distance_km,
         t.vehicle_type
  from public.passenger_trips t
  where t.status='open'
    and not exists (
      select 1 from public.served_matches sm
       where sm.viewer_msisdn = _viewer and sm.kind='passenger' and sm.target_id=t.id
    )
  order by t.created_at desc, distance_km asc
  limit coalesce(_limit, 10)
$$;

-- Nearby drivers (for passengers)
create or replace function public.nearby_drivers(_lat double precision, _lon double precision, _viewer text, _limit int, _vehicle text)
returns table(msisdn text, distance_km numeric, vehicle_type text) language sql stable as $$
  select d.msisdn,
         km(d.geo, st_setsrid(st_point(_lon,_lat),4326)::geography) as distance_km,
         coalesce(d.vehicle_type,'any')
  from public.drivers d
  where d.is_available = true and d.geo is not null
    and (_vehicle is null or _vehicle='any' or d.vehicle_type=_vehicle)
    and not exists (
      select 1 from public.served_matches sm
       where sm.viewer_msisdn = _viewer and sm.kind='driver' and sm.target_id::text=d.msisdn
    )
  order by d.last_seen desc, distance_km asc
  limit coalesce(_limit, 10)
$$;

-- Lock RLS
alter table public.businesses enable row level security;
alter table public.served_matches enable row level security;
alter table public.drivers enable row level security;
alter table public.passenger_trips enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='businesses') then
    create policy deny_all_businesses on public.businesses for all using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='served_matches') then
    create policy deny_all_served on public.served_matches for all using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='drivers') then
    create policy deny_all_drivers on public.drivers for all using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='passenger_trips') then
    create policy deny_all_trips on public.passenger_trips for all using (false);
  end if;
end$$;

-- ===================== TOKENS (wallet/ledger) =====================
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_code text unique not null,
  whatsapp text not null,
  status text not null default 'active',
  allow_any_shop boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.wallet_qr (
  wallet_id uuid primary key references public.wallets(id) on delete cascade,
  qr_secret text not null unique,
  revoked boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists public.ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('issuer','wallet','shop')),
  wallet_id uuid references public.wallets(id),
  shop_id   uuid references public.shops(id),
  unique (kind, wallet_id, shop_id)
);

create table if not exists public.account_balances (
  account_id uuid primary key references public.ledger_accounts(id) on delete cascade,
  balance int not null default 0
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('issue','spend','reversal','settlement')),
  merchant_id uuid references public.shops(id),
  amount int not null check (amount > 0),
  idempotency_key text unique,
  created_at timestamptz default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  tx_id uuid references public.transactions(id) on delete cascade,
  account_id uuid references public.ledger_accounts(id),
  amount int not null check (amount > 0),
  is_debit boolean not null,
  created_at timestamptz default now()
);

create or replace function public.apply_ledger_entry()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.account_balances(account_id, balance)
    values (new.account_id, case when new.is_debit then new.amount else -new.amount end)
    on conflict (account_id) do update
    set balance = public.account_balances.balance
               + (case when excluded.balance >= 0 then excluded.balance else excluded.balance end);
  end if;
  return new;
end$$;

drop trigger if exists trg_apply_ledger_entry on public.ledger_entries;
create trigger trg_apply_ledger_entry after insert on public.ledger_entries
for each row execute function public.apply_ledger_entry();

create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  qr_secret text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_scan_sessions_wallet on public.scan_sessions (wallet_id);
create index if not exists idx_scan_sessions_expires on public.scan_sessions (expires_at);

alter table public.wallets enable row level security;
alter table public.wallet_qr enable row level security;
alter table public.ledger_accounts enable row level security;
alter table public.account_balances enable row level security;
alter table public.transactions enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.scan_sessions enable row level security;

do $$
begin
  perform 1 from pg_policies where tablename='wallets'; if not found then
    create policy deny_all_wallets on public.wallets for all using (false);
  end if;
  perform 1 from pg_policies where tablename='wallet_qr'; if not found then
    create policy deny_all_wallet_qr on public.wallet_qr for all using (false);
  end if;
  perform 1 from pg_policies where tablename='ledger_accounts'; if not found then
    create policy deny_all_ledger_accounts on public.ledger_accounts for all using (false);
  end if;
  perform 1 from pg_policies where tablename='account_balances'; if not found then
    create policy deny_all_balances on public.account_balances for all using (false);
  end if;
  perform 1 from pg_policies where tablename='transactions'; if not found then
    create policy deny_all_tx on public.transactions for all using (false);
  end if;
  perform 1 from pg_policies where tablename='ledger_entries'; if not found then
    create policy deny_all_entries on public.ledger_entries for all using (false);
  end if;
  perform 1 from pg_policies where tablename='scan_sessions'; if not found then
    create policy deny_all_scans on public.scan_sessions for all using (false);
  end if;
end$$;

create or replace view public.v_wallet_balances as
select w.id as wallet_id, coalesce(b.balance,0) as balance
from public.wallets w
left join public.ledger_accounts la on la.kind='wallet' and la.wallet_id=w.id
left join public.account_balances b on b.account_id = la.id;

-- ===================== INSURANCE (leads) =====================
create table if not exists public.insurance_leads (
  id uuid primary key default gen_random_uuid(),
  from_msisdn text not null,
  file1_url text,  -- first file only (image/pdf)
  ocr_json jsonb,  -- merged OCR
  status text not null default 'new', -- new|prepped|sent_to_admin
  created_at timestamptz default now()
);
alter table public.insurance_leads enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='insurance_leads') then
    create policy deny_all_insurance on public.insurance_leads for all using (false);
  end if;
end$$;

-- ===================== BASKETS =====================
do $$ begin
  perform 1 from pg_type where typname='basket_type';
  if not found then create type basket_type as enum ('public','private'); end if;
end $$;

do $$ begin
  perform 1 from pg_type where typname='basket_status';
  if not found then create type basket_status as enum ('draft','pending_review','approved','rejected','suspended','closed'); end if;
end $$;

do $$ begin
  perform 1 from pg_type where typname='member_role';
  if not found then create type member_role as enum ('creator','member','watcher'); end if;
end $$;

do $$ begin
  perform 1 from pg_type where typname='contribution_status';
  if not found then create type contribution_status as enum ('initiated','pending_creator_check','approved','not_received','expired','cancelled'); end if;
end $$;

create table if not exists public.profiles (
  user_id uuid primary key default gen_random_uuid(),
  msisdn text unique not null,
  display_name text,
  locale text default 'rw',
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.baskets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  momo_number text,
  momo_code text,
  type basket_type not null,
  status basket_status not null default 'draft',
  currency text not null default 'RWF',
  creator_id uuid references public.profiles(user_id) on delete restrict,
  public_slug text unique,
  created_at timestamptz default now(),
  approved_at timestamptz,
  closed_at timestamptz
);

create table if not exists public.basket_members (
  basket_id uuid references public.baskets(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete cascade,
  role member_role not null default 'member',
  added_by uuid references public.profiles(user_id),
  created_at timestamptz default now(),
  primary key (basket_id, user_id, role)
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid references public.baskets(id) on delete cascade,
  contributor_id uuid references public.profiles(user_id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null default 'RWF',
  status contribution_status not null default 'initiated',
  ussd_session_ref text,
  note text,
  approved_by uuid references public.profiles(user_id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.contribution_events (
  id bigserial primary key,
  contribution_id uuid references public.contributions(id) on delete cascade,
  event text not null,
  actor uuid references public.profiles(user_id),
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists public.admin_actions (
  id bigserial primary key,
  admin_id uuid references public.profiles(user_id),
  basket_id uuid references public.baskets(id),
  action text not null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists public.shortlinks (
  slug text primary key,
  basket_id uuid references public.baskets(id) on delete cascade,
  is_private boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.chat_sessions (
  user_id text primary key,         -- we store msisdn as “user_id” here for Whatsapp-only
  state jsonb,
  last_msg_id text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.baskets enable row level security;
alter table public.basket_members enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_events enable row level security;
alter table public.admin_actions enable row level security;
alter table public.shortlinks enable row level security;
alter table public.chat_sessions enable row level security;

do $$
begin
  perform 1 from pg_policies where tablename='profiles'; if not found then
    create policy deny_profiles on public.profiles for all using (false);
  end if;
  perform 1 from pg_policies where tablename='baskets'; if not found then
    create policy deny_baskets on public.baskets for all using (false);
  end if;
  perform 1 from pg_policies where tablename='basket_members'; if not found then
    create policy deny_basket_members on public.basket_members for all using (false);
  end if;
  perform 1 from pg_policies where tablename='contributions'; if not found then
    create policy deny_contributions on public.contributions for all using (false);
  end if;
  perform 1 from pg_policies where tablename='contribution_events'; if not found then
    create policy deny_contribution_events on public.contribution_events for all using (false);
  end if;
  perform 1 from pg_policies where tablename='admin_actions'; if not found then
    create policy deny_admin_actions on public.admin_actions for all using (false);
  end if;
  perform 1 from pg_policies where tablename='shortlinks'; if not found then
    create policy deny_shortlinks on public.shortlinks for all using (false);
  end if;
  perform 1 from pg_policies where tablename='chat_sessions'; if not found then
    create policy deny_chat_sessions on public.chat_sessions for all using (false);
  end if;
end$$;

-- Seed a tiny reference shop if missing (Kigali Mart)
insert into public.shops(name, short_code, is_active)
values ('Kigali Mart', 'KIGALI', true)
on conflict (short_code) do update set is_active=excluded.is_active;


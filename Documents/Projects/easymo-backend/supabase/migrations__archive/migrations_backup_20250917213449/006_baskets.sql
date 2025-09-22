-- ===== TYPES (idempotent) =====
do $$ begin
  if not exists (select 1 from pg_type where typname='basket_type') then
    create type basket_type as enum ('public','private');
  end if;
  if not exists (select 1 from pg_type where typname='basket_status') then
    create type basket_status as enum ('draft','pending_review','approved','rejected','suspended','closed');
  end if;
  if not exists (select 1 from pg_type where typname='member_role') then
    create type member_role as enum ('creator','member','watcher');
  end if;
  if not exists (select 1 from pg_type where typname='contribution_status') then
    create type contribution_status as enum ('initiated','pending_creator_check','approved','not_received','expired','cancelled');
  end if;
end $$;

-- ===== TABLES (idempotent) =====
create table if not exists public.baskets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  momo_number text,                       -- 07XXXXXXXX (10 digits) or null if using code
  momo_code text,                         -- 4–9 digits or null
  type basket_type not null,
  status basket_status not null default 'draft',
  currency text not null default 'RWF',
  creator_id uuid references public.profiles(user_id) on delete restrict,
  public_slug text unique,                -- short link for sharing public baskets
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

create table if not exists public.shortlinks (
  slug text primary key,
  basket_id uuid references public.baskets(id) on delete cascade,
  is_private boolean default false,
  created_at timestamptz default now()
);

-- Useful indices
create index if not exists idx_contrib_basket on public.contributions(basket_id);
create index if not exists idx_basket_members_user on public.basket_members(user_id);
create index if not exists idx_baskets_creator on public.baskets(creator_id);

-- ===== CONFIG: admin numbers for baskets =====
alter table public.app_config
  add column if not exists baskets_admin_numbers text;  -- comma-separated e164 (optional)

-- ===== RLS: deny-all (Edge Functions use service role) =====
alter table public.baskets enable row level security;
alter table public.basket_members enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_events enable row level security;
alter table public.shortlinks enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='baskets') then
    create policy no_public_baskets on public.baskets for all using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='basket_members') then
    create policy no_public_basket_members on public.basket_members for all using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='contributions') then
    create policy no_public_contributions on public.contributions for all using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='contribution_events') then
    create policy no_public_contribution_events on public.contribution_events for all using (false);
  end if;
  if not exists (select 1 from pg_policies where tablename='shortlinks') then
    create policy no_public_shortlinks on public.shortlinks for all using (false);
  end if;
end $$;

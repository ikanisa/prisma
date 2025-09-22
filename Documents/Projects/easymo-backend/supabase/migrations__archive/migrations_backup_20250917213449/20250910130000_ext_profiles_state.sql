-- ✅ Idempotent core bits used by the webhook (profiles, chat_state, wa_events)
-- ✅ Safe bucket creation for 'insurance' (no EXCEPTION misuse)

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- 1) Minimal profile (WhatsApp-first)
create table if not exists public.profiles (
  user_id uuid primary key default gen_random_uuid(),
  whatsapp_e164 text unique not null,
  display_name text,
  locale text default 'en',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles') then
    create policy deny_all_profiles on public.profiles for all using (false);
  end if;
end$$;

-- 2) Chat state (FSM)
create table if not exists public.chat_state (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.chat_state enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='chat_state') then
    create policy deny_all_chat_state on public.chat_state for all using (false);
  end if;
end$$;

-- 3) Idempotency ledger for WA message IDs
create table if not exists public.wa_events (
  wa_message_id text primary key,
  created_at timestamptz not null default now()
);
alter table public.wa_events enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='wa_events') then
    create policy deny_all_wa_events on public.wa_events for all using (false);
  end if;
end$$;

-- 4) Private storage bucket for insurance uploads (idempotent, no exceptions needed)
do $$
begin
  -- Only attempt if the 'storage' schema exists (it does in Supabase projects)
  if exists (
    select 1 from information_schema.schemata where schema_name = 'storage'
  ) then
    if not exists (
      select 1 from storage.buckets where id = 'insurance'
    ) then
      if exists (
        select 1 from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'storage' and p.proname = 'create_bucket'
      ) then
        perform storage.create_bucket('insurance', public => false);
      end if;
    end if;
  end if;
end
$$ language plpgsql;

-- Migration: Normalize schema across commerce and mobility domains
-- This script creates unified listing and order tables to replace disparate
-- product, produce, property and vehicle tables. It also introduces
-- enumerated types for consistent statuses and messaging.
-- Existing data should be migrated into these tables via separate scripts.

-- Enable necessary extensions for UUID generation and spatial data
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- Drop enumerated types if they exist (to allow re-definition)
do $$ begin
  if exists (select 1 from pg_type where typname = 'listing_type') then
    drop type public.listing_type cascade;
  end if;
  if exists (select 1 from pg_type where typname = 'listing_status') then
    drop type public.listing_status cascade;
  end if;
  if exists (select 1 from pg_type where typname = 'order_status') then
    drop type public.order_status cascade;
  end if;
  if exists (select 1 from pg_type where typname = 'channel_type') then
    drop type public.channel_type cascade;
  end if;
  if exists (select 1 from pg_type where typname = 'sender_type') then
    drop type public.sender_type cascade;
  end if;
  if exists (select 1 from pg_type where typname = 'message_type') then
    drop type public.message_type cascade;
  end if;
  if exists (select 1 from pg_type where typname = 'message_status') then
    drop type public.message_status cascade;
  end if;
end $$;

-- Enumerated types for unified entities
create type public.listing_type as enum ('product', 'produce', 'property', 'vehicle', 'service');
create type public.listing_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.order_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'failed');
create type public.channel_type as enum ('whatsapp', 'telegram', 'web', 'mobile');
create type public.sender_type as enum ('customer', 'business', 'driver', 'system', 'agent');
create type public.message_type as enum ('text', 'image', 'document', 'template', 'location');
create type public.message_status as enum ('received', 'processed', 'failed');

-- Create users table if it doesn't exist
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique,
  phone text,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unified listings table
create table if not exists public.unified_listings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.users(id) on delete cascade,
  type public.listing_type not null,
  title text not null,
  description text,
  location_gps geometry(point, 4326),
  status public.listing_status not null default 'draft',
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to update updated_at on unified_listings
create or replace function public.update_unified_listings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;
drop trigger if exists trg_update_unified_listings_updated_at on public.unified_listings;
create trigger trg_update_unified_listings_updated_at
before update on public.unified_listings
for each row execute function public.update_unified_listings_updated_at();

-- Unified orders table
create table if not exists public.unified_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  listing_id uuid references public.unified_listings(id) on delete cascade,
  quantity integer not null default 1,
  price numeric not null,
  status public.order_status not null default 'pending',
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to update updated_at on unified_orders
create or replace function public.update_unified_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;
drop trigger if exists trg_update_unified_orders_updated_at on public.unified_orders;
create trigger trg_update_unified_orders_updated_at
before update on public.unified_orders
for each row execute function public.update_unified_orders_updated_at();

-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  channel public.channel_type not null default 'whatsapp',
  context jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.update_conversations_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;
drop trigger if exists trg_update_conversations_updated_at on public.conversations;
create trigger trg_update_conversations_updated_at
before update on public.conversations
for each row execute function public.update_conversations_updated_at();

-- Messages table
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.users(id),
  sender_type public.sender_type not null,
  type public.message_type not null default 'text',
  status public.message_status not null default 'received',
  content text,
  raw jsonb,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- Index for spatial queries on unified_listings
create index if not exists idx_unified_listings_location
on public.unified_listings using gist (location_gps);

-- Row-level security: enable and define policies
alter table public.unified_listings enable row level security;
alter table public.unified_orders enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Allow admins full access
create policy "Admin access unified_listings" on public.unified_listings for all using (is_admin());
create policy "Admin access unified_orders" on public.unified_orders for all using (is_admin());
create policy "Admin access conversations" on public.conversations for all using (is_admin());
create policy "Admin access messages" on public.messages for all using (is_admin());

-- Allow users to read/write their own listings and orders
create policy "User own listings" on public.unified_listings
  for select using (owner_id = auth.uid());
create policy "User own orders" on public.unified_orders
  for select using (user_id = auth.uid());
create policy "User conversation access" on public.conversations
  for select using (user_id = auth.uid());
create policy "User message access" on public.messages
  for select using (
    exists(select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
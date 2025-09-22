-- Create shops table (additive-safe)
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Optional: index for quick lookups by short_code
create index if not exists idx_shops_short_code on public.shops(short_code);

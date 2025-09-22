-- Simple categories table: id + name (unique)
create table if not exists public.marketplace_categories (
  id bigserial primary key
);

-- Ensure the "name" column exists
alter table public.marketplace_categories
  add column if not exists name text;

-- Make name unique so ON CONFLICT(name) works
create unique index if not exists uniq_marketplace_categories_name
  on public.marketplace_categories(name);

-- Seed (idempotent)
insert into public.marketplace_categories(name) values
  ('Groceries'),
  ('Pharmacy'),
  ('Mechanic'),
  ('Salon'),
  ('Restaurant'),
  ('General')
on conflict (name) do nothing;

-- Ensure categories table exists
create table if not exists public.marketplace_categories (
  id bigserial primary key
);

-- Add required columns (no errors if they already exist)
alter table public.marketplace_categories
  add column if not exists code  text,
  add column if not exists label text;

-- Make "code" uniquely upsertable
create unique index if not exists uniq_marketplace_categories_code
  on public.marketplace_categories(code);

-- Seed (idempotent: safe to run many times)
insert into public.marketplace_categories(code, label) values
  ('groceries','Groceries'),
  ('pharmacy','Pharmacy'),
  ('mechanic','Mechanic'),
  ('salon','Salon'),
  ('restaurant','Restaurant'),
  ('general','General')
on conflict (code) do update
  set label = excluded.label;

-- keep categories very simple: id + name(unique)
create table if not exists public.marketplace_categories (
  id bigserial primary key,
  name text not null unique
);

-- remove old columns (code/label) if they exist
alter table public.marketplace_categories drop column if exists code;
alter table public.marketplace_categories drop column if exists label;

-- seed names (no code/label)
insert into public.marketplace_categories(name) values
  ('Groceries'),
  ('Pharmacy'),
  ('Mechanic'),
  ('Salon'),
  ('Restaurant'),
  ('General')
on conflict (name) do nothing;

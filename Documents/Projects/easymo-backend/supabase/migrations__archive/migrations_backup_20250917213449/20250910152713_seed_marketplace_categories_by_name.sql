insert into public.marketplace_categories(name)
values
  ('Groceries'),
  ('Pharmacy'),
  ('Mechanic'),
  ('Salon'),
  ('Restaurant'),
  ('General')
on conflict (name) do nothing;

insert into public.marketplace_categories(code,label) values
  ('groceries','Groceries'),
  ('pharmacy','Pharmacy'),
  ('mechanic','Mechanic'),
  ('salon','Salon'),
  ('restaurant','Restaurant'),
  ('general','General')
on conflict (code) do update set label = excluded.label;

-- Seed a default shop row (id auto, created_at auto)
insert into public.shops (name, short_code, is_active)
values ('Kigali Shop', 'KGL', true)
on conflict (short_code) do nothing;

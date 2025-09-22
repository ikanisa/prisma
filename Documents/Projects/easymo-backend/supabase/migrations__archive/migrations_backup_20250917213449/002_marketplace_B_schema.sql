-- Categories
create table if not exists marketplace_categories (
  id serial primary key,
  name text unique not null
);

insert into marketplace_categories (name) values
  ('Groceries & Provisions'),
  ('Hardware & Construction Materials'),
  ('Spare Parts & Auto Accessories'),
  ('Pharmacies & Medical Supplies'),
  ('Salon & Barber Services'),
  ('Beauty & Cosmetics'),
  ('Fresh Produce & Meat'),
  ('Clothing & Shoes'),
  ('Household Goods & Furniture'),
  ('Electronics & Appliances'),
  ('Mobile Money & Financial Services'),
  ('Transport Services (Moto Taxis, Car Hire)'),
  ('Agricultural Inputs & Tools'),
  ('Catering & Restaurants'),
  ('Books & Stationery'),
  ('Education & Training Services'),
  ('Event & Wedding Services'),
  ('Sports & Fitness Goods'),
  ('Tailoring & Fashion Design'),
  ('Laundry & Cleaning Services'),
  ('Real Estate & Rentals'),
  ('IT & Electronics Repair'),
  ('Handicrafts & Art'),
  ('Legal & Insurance Services'),
  ('Medical Clinics'),
  ('Travel & Hospitality'),
  ('Bakery & Confectionery'),
  ('Kids & Baby Products'),
  ('Pet & Livestock Supplies'),
  ('General Services (Plumbers, Electricians, Labour)')
on conflict do nothing;

-- Businesses
create table if not exists businesses (
  id bigserial primary key,
  owner_user_id uuid not null references profiles(user_id) on delete cascade,
  category_id integer not null references marketplace_categories(id) on delete restrict,
  name text not null,
  description text,
  location geography(Point, 4326) not null,
  created_at timestamptz default now()
);
create index if not exists idx_businesses_category on businesses (category_id);
create index if not exists idx_businesses_location on businesses using gist (location);
create index if not exists idx_businesses_created on businesses (created_at);

-- RLS locked
alter table marketplace_categories enable row level security;
alter table businesses enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='marketplace_categories') then
    create policy no_public_marketplace_categories on marketplace_categories for all using (false);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='businesses') then
    create policy no_public_businesses on businesses for all using (false);
  end if;
end$$;

-- Nearby businesses RPC
create or replace function recent_businesses_near(
  in_lat double precision,
  in_lng double precision,
  in_category_id integer,
  in_radius_km numeric,
  in_max integer
) returns table (
  business_id bigint,
  name text,
  owner_user_id uuid,
  created_at timestamptz
) language sql stable as $$
  select b.id, b.name, b.owner_user_id, b.created_at
  from businesses b
  where (in_category_id is null or b.category_id = in_category_id)
    and st_dwithin(
      b.location::geography,
      st_setsrid(st_makepoint(in_lng, in_lat), 4326),
      in_radius_km * 1000
    )
  order by b.created_at desc
  limit greatest(in_max, 1);
$$;

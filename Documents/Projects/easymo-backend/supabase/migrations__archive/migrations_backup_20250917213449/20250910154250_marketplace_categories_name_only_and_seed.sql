-- 1) Categories: id + unique name (single source of truth)
create table if not exists public.marketplace_categories (
  id   bigserial primary key,
  name text unique not null
);

-- 2) Businesses: ensure category_id exists and points to categories.id (idempotent)
alter table public.businesses
  add column if not exists category_id bigint
    references public.marketplace_categories(id) on delete set null;

-- 3) Seed by name only (safe upsert on unique name)
insert into public.marketplace_categories(name) values
  ('Groceries'),
  ('Pharmacy'),
  ('Mechanic'),
  ('Salon'),
  ('Restaurant'),
  ('General')
on conflict (name) do nothing;

-- 4) Distance helper without round() (avoid dp/int mismatch)
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select (ST_Distance(a,b) / 1000.0)::numeric
$$;

-- 5) Nearby businesses (NO "served" filter; optional category)
create or replace function public.nearby_businesses(
  _lat double precision, _lon double precision, _viewer text, _limit int,
  _category_id bigint default null
) returns table(
  id uuid, name text, description text, distance_km numeric
) language sql stable as $$
  with pt as (
    select ST_SetSRID(ST_Point(_lon,_lat),4326)::geography g
  )
  select b.id,
         b.name,
         coalesce(b.description,'') as description,
         km(b.geo, pt.g) as distance_km
  from public.businesses b, pt
  where b.geo is not null
    and b.is_active = true
    and (_category_id is null or b.category_id = _category_id)
  order by km(b.geo, pt.g) asc, b.created_at desc
  limit greatest(1, coalesce(_limit,10));
$$;

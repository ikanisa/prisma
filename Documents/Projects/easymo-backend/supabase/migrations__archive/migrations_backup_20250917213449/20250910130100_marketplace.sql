-- Categories
create table if not exists public.marketplace_categories (
  id bigserial primary key,
  name text unique not null
);

-- Businesses (always visible)
create table if not exists public.businesses (
  id bigserial primary key,
  owner_user_id uuid references public.profiles(user_id) on delete set null,
  category_id bigint references public.marketplace_categories(id) on delete set null,
  name text not null,
  description text,
  location text,
  geo geography(Point,4326),
  is_active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_businesses_geo on public.businesses using gist(geo);

-- Distance helper (km)
create or replace function public.km(a geography, b geography)
returns numeric language sql immutable as $$
  select round(ST_Distance(a,b)/1000.0, 2)
$$;

-- Nearby businesses (NO "served" filter; optional category)
create or replace function public.nearby_businesses(
  _lat double precision, _lon double precision, _viewer text, _limit int,
  _category_id bigint default null
) returns table(
  id bigint, name text, description text, distance_km numeric
) language sql stable as $$
  with pt as (
    select ST_SetSRID(ST_Point(_lon,_lat),4326)::geography g
  )
  select b.id, b.name, coalesce(b.description,''), km(b.geo, pt.g) as distance_km
  from public.businesses b, pt
  where b.geo is not null
    and b.is_active = true
    and (_category_id is null or b.category_id = _category_id)
  order by km(b.geo, pt.g) asc, b.created_at desc
  limit greatest(1, coalesce(_limit,10))
$$;

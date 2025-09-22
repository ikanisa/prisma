begin;

create extension if not exists postgis;

alter table if exists public.businesses
  add column if not exists is_active boolean default true;

commit;

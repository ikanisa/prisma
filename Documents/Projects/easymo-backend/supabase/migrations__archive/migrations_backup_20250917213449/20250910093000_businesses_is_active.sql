-- Add columns that the nearby_businesses() function expects
alter table public.businesses
  add column if not exists is_active boolean not null default true,
  add column if not exists description text;

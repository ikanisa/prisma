-- Ensure table exists at least in minimal form
create table if not exists public.marketplace_categories (
  id   bigserial primary key,
  name text
);

-- Add code/label if missing
alter table public.marketplace_categories
  add column if not exists code  text,
  add column if not exists label text;

-- Create a UNIQUE index on code (required for ON CONFLICT (code))
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='uq_marketplace_categories_code'
  ) then
    create unique index uq_marketplace_categories_code
      on public.marketplace_categories(code);
  end if;
end$$;

-- Backfill code/label from name when empty (safe)
update public.marketplace_categories
set
  code  = coalesce(code, lower(regexp_replace(name,'\s+','-','g'))),
  label = coalesce(label, name)
where code is null or label is null;

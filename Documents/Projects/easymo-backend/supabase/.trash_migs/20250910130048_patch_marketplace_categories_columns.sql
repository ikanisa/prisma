-- Add missing columns for categories to support (code, label) inserts
do $$
begin
  -- create table if someone wiped it
  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='marketplace_categories'
  ) then
    create table public.marketplace_categories (
      id bigserial primary key,
      name text unique not null
    );
  end if;

  -- add code column if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketplace_categories' and column_name='code'
  ) then
    alter table public.marketplace_categories add column code text;
  end if;

  -- add label column if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketplace_categories' and column_name='label'
  ) then
    alter table public.marketplace_categories add column label text;
  end if;

  -- backfill label from name where label is null (harmless if table is empty)
  update public.marketplace_categories
     set label = coalesce(label, name);

  -- make code unique when provided (still allows nulls)
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='uniq_marketplace_categories_code'
  ) then
    create unique index uniq_marketplace_categories_code
      on public.marketplace_categories (code)
      where code is not null;
  end if;
end$$;

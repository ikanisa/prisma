-- Ensure marketplace_categories exists with (code,label) and a UNIQUE constraint on (code)
do $$
begin
  -- 1) Create table if missing (id + name base)
  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='marketplace_categories'
  ) then
    create table public.marketplace_categories (
      id bigserial primary key,
      name text unique not null
    );
  end if;

  -- 2) Add columns if missing
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketplace_categories' and column_name='code'
  ) then
    alter table public.marketplace_categories add column code text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='marketplace_categories' and column_name='label'
  ) then
    alter table public.marketplace_categories add column label text;
  end if;

  -- 3) Backfill label from name when label is null (safe if empty)
  update public.marketplace_categories
     set label = coalesce(label, name)
   where label is null;

  -- 4) Drop any old partial unique index on code (not usable by ON CONFLICT (code))
  if exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='uniq_marketplace_categories_code'
  ) then
    drop index public.uniq_marketplace_categories_code;
  end if;

  -- 5) Add the proper UNIQUE constraint Postgres needs for ON CONFLICT (code)
  --    (allows multiple NULLs; that’s fine)
  begin
    alter table public.marketplace_categories
      add constraint marketplace_categories_code_key unique (code);
  exception
    when duplicate_table then null; -- constraint already there
    when duplicate_object then null;
  end;

end$$;

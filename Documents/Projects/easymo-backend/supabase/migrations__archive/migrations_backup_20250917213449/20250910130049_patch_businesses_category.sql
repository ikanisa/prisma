-- Add category_id to public.businesses if missing (and FK if categories table exists)
do $$
begin
  -- 1) column
  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='businesses' and column_name='category_id'
  ) then
    alter table public.businesses add column category_id bigint;
  end if;

  -- 2) foreign key (only if marketplace_categories already exists)
  if exists (
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='marketplace_categories'
  ) then
    if not exists (
      select 1 from pg_constraint where conname='businesses_category_fk'
    ) then
      alter table public.businesses
        add constraint businesses_category_fk
        foreign key (category_id)
        references public.marketplace_categories(id)
        on delete set null;
    end if;
  end if;
end$$;

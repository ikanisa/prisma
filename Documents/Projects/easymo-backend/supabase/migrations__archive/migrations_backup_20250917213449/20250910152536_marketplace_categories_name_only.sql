-- Keep the table minimal: id + unique name
create table if not exists public.marketplace_categories (
  id   bigserial primary key,
  name text unique not null
);

-- If older columns slipped in before, drop them to end the confusion
alter table public.marketplace_categories drop column if exists code;
alter table public.marketplace_categories drop column if exists label;

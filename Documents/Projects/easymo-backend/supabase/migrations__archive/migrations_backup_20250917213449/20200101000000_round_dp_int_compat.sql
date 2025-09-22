-- Compatibility wrapper so legacy migrations using round(double precision, int) succeed.
-- Postgres only ships round(numeric, int) by default.
create or replace function public.round(value double precision, ndigits integer)
returns numeric
language sql
immutable
as $$
  select round((value)::numeric, ndigits);
$$;

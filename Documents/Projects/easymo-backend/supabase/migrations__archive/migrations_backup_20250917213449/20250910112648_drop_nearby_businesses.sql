begin;

drop function if exists public.nearby_businesses(double precision, double precision, int);
drop function if exists public.nearby_businesses(double precision, double precision, text, int);
drop function if exists public.nearby_businesses(double precision, double precision, double precision, int);
drop function if exists public.nearby_businesses(double precision, double precision, double precision);

commit;

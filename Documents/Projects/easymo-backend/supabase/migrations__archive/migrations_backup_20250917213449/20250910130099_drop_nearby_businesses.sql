begin;

drop function if exists public.nearby_businesses(double precision,double precision,text,int,bigint);

drop function if exists public.nearby_businesses(double precision,double precision,text,int);

commit;

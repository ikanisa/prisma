do $$ begin
  create type basket_type as enum ('public','private');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type basket_status as enum ('draft','pending_review','approved','rejected','suspended','closed');
  exception when duplicate_object then null;
end $$;

create table if not exists public.baskets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type basket_type not null,
  status basket_status not null default 'draft',
  public_slug text unique,
  creator_id uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.basket_members (
  basket_id uuid references public.baskets(id) on delete cascade,
  user_id uuid references public.profiles(user_id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  primary key (basket_id, user_id)
);

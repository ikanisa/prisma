create table if not exists public.notification_dispatch_queue (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.app_users (user_id) on delete cascade,
  channel text not null check (channel = any (array['email','sms','webhook']::text[])),
  payload jsonb not null,
  status text not null default 'pending' check (status = any (array['pending','processing','sent','failed']::text[])),
  attempts integer not null default 0,
  last_error text,
  scheduled_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_dispatch_queue_status_idx
  on public.notification_dispatch_queue (status, scheduled_at asc);
create index if not exists notification_dispatch_queue_notification_idx
  on public.notification_dispatch_queue (notification_id);
create index if not exists notification_dispatch_queue_user_idx
  on public.notification_dispatch_queue (user_id);

create or replace function public.set_notification_dispatch_queue_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists notification_dispatch_queue_set_updated_at on public.notification_dispatch_queue;
create trigger notification_dispatch_queue_set_updated_at
before update on public.notification_dispatch_queue
for each row
execute function public.set_notification_dispatch_queue_updated_at();

create table if not exists public.user_notification_preferences (
  user_id uuid not null references public.app_users (user_id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  email_override text,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  sms_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

create index if not exists user_notification_preferences_sms_idx
  on public.user_notification_preferences (sms_enabled)
  where sms_enabled = true;

create or replace function public.set_user_notification_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_notification_preferences_set_updated_at on public.user_notification_preferences;
create trigger user_notification_preferences_set_updated_at
before update on public.user_notification_preferences
for each row
execute function public.set_user_notification_preferences_updated_at();

alter table public.user_notification_preferences enable row level security;

drop policy if exists user_notification_preferences_self on public.user_notification_preferences;
create policy user_notification_preferences_self
  on public.user_notification_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

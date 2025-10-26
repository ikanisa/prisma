-- NPS responses table for capturing user feedback
create table if not exists public.nps_responses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  score integer not null check (score between 0 and 10),
  feedback text,
  submitted_at timestamptz not null default timezone('utc', now())
);

comment on table public.nps_responses is 'Net Promoter Score responses captured from in-app surveys.';

create index if not exists idx_nps_responses_org on public.nps_responses(org_id, submitted_at desc);

alter table public.nps_responses enable row level security;

drop policy if exists nps_responses_select on public.nps_responses;
create policy nps_responses_select on public.nps_responses
  for select
  using (
    auth.role() = 'service_role'
    or (
      auth.role() = 'authenticated'
      and public.is_member_of(org_id)
    )
  );

drop policy if exists nps_responses_insert_service on public.nps_responses;
create policy nps_responses_insert_service on public.nps_responses
  for insert
  with check (auth.role() = 'service_role');

comment on policy nps_responses_select on public.nps_responses is 'Allow service role and organization members to read NPS responses.';
comment on policy nps_responses_insert_service on public.nps_responses is 'Only the service role (via backend API) can insert NPS responses.';

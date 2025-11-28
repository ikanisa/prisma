-- IAM-3 RLS policies for MFA challenges
set check_function_bodies = off;

alter table public.mfa_challenges enable row level security;

drop policy if exists mfa_challenges_select on public.mfa_challenges;
create policy mfa_challenges_select on public.mfa_challenges
  for select using (
    public.is_member_of(org_id) and auth.uid() = user_id
  );

drop policy if exists mfa_challenges_insert on public.mfa_challenges;
create policy mfa_challenges_insert on public.mfa_challenges
  for insert with check (
    public.is_member_of(org_id) and auth.uid() = user_id
  );

drop policy if exists mfa_challenges_update on public.mfa_challenges;
create policy mfa_challenges_update on public.mfa_challenges
  for update using (
    public.is_member_of(org_id) and auth.uid() = user_id
  ) with check (
    public.is_member_of(org_id) and auth.uid() = user_id
  );

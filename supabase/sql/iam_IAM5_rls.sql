-- IAM-5 RLS adjustments for client portal scoping
set check_function_bodies = off;

drop policy if exists documents_client_read on public.documents;
create policy documents_client_read on public.documents
  for select using (
    public.is_member_of(org_id) and (
      not public.has_min_role(org_id, 'CLIENT')
      or portal_visible = true
    )
  );

drop policy if exists tasks_client_read on public.tasks;
create policy tasks_client_read on public.tasks
  for select using (
    public.is_member_of(org_id) and (
      not public.has_min_role(org_id, 'CLIENT')
      or client_visible = true
    )
  );

drop policy if exists tasks_client_update on public.tasks;
create policy tasks_client_update on public.tasks
  for update using (
    public.is_member_of(org_id) and client_visible = true and auth.uid() = client_assignee_id
  )
  with check (
    public.is_member_of(org_id) and client_visible = true and auth.uid() = client_assignee_id
  );

-- Audit E1 row-level security policies for Key Audit Matters module

-- Estimate register policies ------------------------------------------------
alter table public.estimate_register enable row level security;

create policy estimate_register_select on public.estimate_register
  for select using (public.is_member_of(org_id));

create policy estimate_register_write on public.estimate_register
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy estimate_register_update on public.estimate_register
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy estimate_register_delete on public.estimate_register
  for delete using (public.has_min_role(org_id, 'MANAGER'));

-- Going concern worksheet policies ----------------------------------------
alter table public.going_concern_worksheets enable row level security;

create policy gc_worksheets_select on public.going_concern_worksheets
  for select using (public.is_member_of(org_id));

create policy gc_worksheets_write on public.going_concern_worksheets
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy gc_worksheets_update on public.going_concern_worksheets
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy gc_worksheets_delete on public.going_concern_worksheets
  for delete using (public.has_min_role(org_id, 'MANAGER'));

-- Planned procedures policies ---------------------------------------------
alter table public.audit_planned_procedures enable row level security;

create policy planned_procedures_select on public.audit_planned_procedures
  for select using (public.is_member_of(org_id));

create policy planned_procedures_write on public.audit_planned_procedures
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy planned_procedures_update on public.audit_planned_procedures
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy planned_procedures_delete on public.audit_planned_procedures
  for delete using (public.has_min_role(org_id, 'MANAGER'));

-- Audit evidence policies --------------------------------------------------
alter table public.audit_evidence enable row level security;

create policy audit_evidence_select on public.audit_evidence
  for select using (public.is_member_of(org_id));

create policy audit_evidence_write on public.audit_evidence
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy audit_evidence_update on public.audit_evidence
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy audit_evidence_delete on public.audit_evidence
  for delete using (public.has_min_role(org_id, 'MANAGER'));

-- KAM candidate policies ---------------------------------------------------
alter table public.kam_candidates enable row level security;

create policy kam_candidates_select on public.kam_candidates
  for select using (public.is_member_of(org_id));

create policy kam_candidates_write on public.kam_candidates
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy kam_candidates_update on public.kam_candidates
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy kam_candidates_delete on public.kam_candidates
  for delete using (public.has_min_role(org_id, 'MANAGER'));

-- KAM draft policies -------------------------------------------------------
alter table public.kam_drafts enable row level security;

create policy kam_drafts_select on public.kam_drafts
  for select using (public.is_member_of(org_id));

create policy kam_drafts_write on public.kam_drafts
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy kam_drafts_update on public.kam_drafts
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy kam_drafts_delete on public.kam_drafts
  for delete using (public.has_min_role(org_id, 'MANAGER'));

-- Agent workflow policies -------------------------------------------------
alter table public.agent_runs enable row level security;
create policy agent_runs_select on public.agent_runs
  for select using (public.is_member_of(org_id));
create policy agent_runs_insert on public.agent_runs
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));
create policy agent_runs_update on public.agent_runs
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));
create policy agent_runs_delete on public.agent_runs
  for delete using (public.has_min_role(org_id, 'MANAGER'));

alter table public.agent_actions enable row level security;
create policy agent_actions_select on public.agent_actions
  for select using (public.is_member_of(org_id));
create policy agent_actions_insert on public.agent_actions
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));
create policy agent_actions_update on public.agent_actions
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));
create policy agent_actions_delete on public.agent_actions
  for delete using (public.has_min_role(org_id, 'MANAGER'));

alter table public.agent_traces enable row level security;
create policy agent_traces_select on public.agent_traces
  for select using (public.is_member_of(org_id));
create policy agent_traces_insert on public.agent_traces
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));
create policy agent_traces_delete on public.agent_traces
  for delete using (public.has_min_role(org_id, 'MANAGER'));

alter table public.tool_registry enable row level security;
create policy tool_registry_select on public.tool_registry
  for select using (org_id is null or public.is_member_of(org_id));
create policy tool_registry_write on public.tool_registry
  for all using (org_id is null or public.has_min_role(org_id, 'MANAGER'))
  with check (org_id is null or public.has_min_role(org_id, 'MANAGER'));

alter table public.openai_debug_events enable row level security;
create policy openai_debug_events_select on public.openai_debug_events
  for select using (public.has_min_role(org_id, 'SYSTEM_ADMIN') or org_id is null);
create policy openai_debug_events_insert on public.openai_debug_events
  for insert with check (public.has_min_role(org_id, 'SYSTEM_ADMIN') or org_id is null);
create policy openai_debug_events_delete on public.openai_debug_events
  for delete using (public.has_min_role(org_id, 'SYSTEM_ADMIN'));

-- Approval queue policies -------------------------------------------------
alter table public.approval_queue enable row level security;

create policy approval_queue_select on public.approval_queue
  for select using (public.is_member_of(org_id));

create policy approval_queue_write on public.approval_queue
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy approval_queue_update on public.approval_queue
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy approval_queue_delete on public.approval_queue
  for delete using (public.has_min_role(org_id, 'MANAGER'));

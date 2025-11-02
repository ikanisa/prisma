-- Optimise orchestration dependency lookups for batch scheduling
create index if not exists idx_agent_orch_tasks_status_id
  on public.agent_orchestration_tasks(status, id);

create index if not exists idx_agent_orch_tasks_completed
  on public.agent_orchestration_tasks(id)
  where status = 'COMPLETED';

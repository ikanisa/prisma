create index if not exists idx_agent_manifests_key_created_at
  on public.agent_manifests(agent_key, created_at desc);

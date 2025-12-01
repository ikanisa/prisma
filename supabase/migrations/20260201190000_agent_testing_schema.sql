-- Agent Testing Framework Schema

create table if not exists agent_test_runs (
    id bigserial primary key,
    
    -- Test suite info
    suite_name text not null,
    agent_id text not null,
    
    -- Results
    total_tests integer not null,
    passed_tests integer not null,
    failed_tests integer not null,
    pass_rate numeric(5,2) not null,
    
    -- Detailed results
    results_json jsonb not null,
    
    -- Metadata
    run_at timestamptz not null default now(),
    run_by uuid,
    environment text default 'test',
    
    created_at timestamptz not null default now()
);

create index if not exists idx_test_runs_agent on agent_test_runs (agent_id, run_at desc);
create index if not exists idx_test_runs_suite on agent_test_runs (suite_name, run_at desc);

-- RLS
alter table agent_test_runs enable row level security;

create policy "Service role full access to test runs"
    on agent_test_runs for all
    using (auth.role() = 'service_role');

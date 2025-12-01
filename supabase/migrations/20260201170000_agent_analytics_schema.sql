-- Agent Analytics & Monitoring Schema
-- Tracks agent performance, RAG usage, and user interactions

-- ============================================================================
-- 1. Agent Execution Logs
-- ============================================================================

create table if not exists agent_execution_logs (
    id bigserial primary key,
    
    -- Agent identification
    agent_id text not null,
    agent_name text not null,
    agent_version text not null,
    agent_category text not null, -- TAX, AUDIT, CORPORATE, etc.
    
    -- User context
    organization_id uuid,
    user_id uuid,
    
    -- Query details
    user_query text not null,
    query_type text, -- question, calculation, research, etc.
    
    -- Execution details
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    duration_ms integer,
    status text not null default 'pending', -- pending, success, error, timeout
    error_message text,
    
    -- RAG usage
    rag_enabled boolean default false,
    rag_chunks_used integer,
    rag_avg_similarity numeric(5,4),
    rag_top_similarity numeric(5,4),
    rag_categories text[],
    rag_jurisdictions text[],
    
    -- LLM details
    llm_model text,
    llm_temperature numeric(3,2),
    llm_tokens_prompt integer,
    llm_tokens_completion integer,
    llm_tokens_total integer,
    llm_cost_usd numeric(10,6),
    
    -- Response details
    response_length integer,
    has_citations boolean default false,
    citation_count integer,
    confidence_score numeric(3,2), -- 0-1 scale
    
    -- Metadata
    session_id text,
    request_id text,
    metadata jsonb default '{}'::jsonb,
    
    created_at timestamptz not null default now()
);

-- Indexes for query performance
create index if not exists idx_agent_exec_agent_id 
    on agent_execution_logs (agent_id);

create index if not exists idx_agent_exec_org_id 
    on agent_execution_logs (organization_id);

create index if not exists idx_agent_exec_created_at 
    on agent_execution_logs (created_at desc);

create index if not exists idx_agent_exec_status 
    on agent_execution_logs (status);

create index if not exists idx_agent_exec_category 
    on agent_execution_logs (agent_category);

create index if not exists idx_agent_exec_session 
    on agent_execution_logs (session_id);

-- Partial index for active queries
create index if not exists idx_agent_exec_active 
    on agent_execution_logs (started_at desc) 
    where status = 'pending';

-- ============================================================================
-- 2. Agent Feedback & Quality
-- ============================================================================

create table if not exists agent_feedback (
    id bigserial primary key,
    
    execution_log_id bigint references agent_execution_logs(id) on delete cascade,
    
    -- Feedback details
    rating integer check (rating between 1 and 5),
    feedback_type text, -- helpful, accurate, too_long, incorrect, etc.
    feedback_text text,
    
    -- Quality metrics
    was_helpful boolean,
    was_accurate boolean,
    citations_helpful boolean,
    
    -- User context
    user_id uuid,
    
    created_at timestamptz not null default now()
);

create index if not exists idx_agent_feedback_exec_log 
    on agent_feedback (execution_log_id);

create index if not exists idx_agent_feedback_rating 
    on agent_feedback (rating);

-- ============================================================================
-- 3. Agent RAG Usage Tracking
-- ============================================================================

create table if not exists agent_rag_usage (
    id bigserial primary key,
    
    execution_log_id bigint references agent_execution_logs(id) on delete cascade,
    
    -- Agent details
    agent_id text not null,
    
    -- Query details
    user_query text not null,
    query_embedding vector(1536), -- Store for similarity analysis
    
    -- Search parameters
    search_category text,
    search_jurisdiction text,
    search_tags text[],
    search_limit integer,
    
    -- Results
    chunks_returned integer not null,
    chunks_used integer not null,
    avg_similarity numeric(5,4),
    top_similarity numeric(5,4),
    
    -- Performance
    search_time_ms integer,
    
    -- Metadata
    categories_found text[],
    jurisdictions_found text[],
    sources_used text[],
    
    created_at timestamptz not null default now()
);

create index if not exists idx_rag_usage_agent 
    on agent_rag_usage (agent_id);

create index if not exists idx_rag_usage_exec_log 
    on agent_rag_usage (execution_log_id);

create index if not exists idx_rag_usage_created 
    on agent_rag_usage (created_at desc);

-- Vector index for query similarity analysis
create index if not exists idx_rag_usage_embedding 
    on agent_rag_usage using ivfflat (query_embedding vector_cosine_ops)
    with (lists = 100);

-- ============================================================================
-- 4. Agent Performance Metrics (Materialized View)
-- ============================================================================

create materialized view if not exists agent_performance_metrics as
select 
    agent_id,
    agent_name,
    agent_category,
    
    -- Usage metrics
    count(*) as total_executions,
    count(*) filter (where status = 'success') as successful_executions,
    count(*) filter (where status = 'error') as failed_executions,
    count(*) filter (where status = 'timeout') as timeout_executions,
    
    -- Performance metrics
    avg(duration_ms) filter (where status = 'success') as avg_duration_ms,
    percentile_cont(0.5) within group (order by duration_ms) filter (where status = 'success') as median_duration_ms,
    percentile_cont(0.95) within group (order by duration_ms) filter (where status = 'success') as p95_duration_ms,
    
    -- RAG metrics
    count(*) filter (where rag_enabled = true) as rag_enabled_count,
    avg(rag_chunks_used) filter (where rag_enabled = true) as avg_rag_chunks,
    avg(rag_top_similarity) filter (where rag_enabled = true) as avg_rag_similarity,
    
    -- LLM metrics
    sum(llm_tokens_total) as total_tokens_used,
    sum(llm_cost_usd) as total_cost_usd,
    avg(llm_tokens_total) as avg_tokens_per_query,
    
    -- Quality metrics
    avg(confidence_score) as avg_confidence,
    count(*) filter (where has_citations = true) as queries_with_citations,
    
    -- Feedback metrics
    avg(f.rating) as avg_rating,
    count(f.id) as feedback_count,
    count(f.id) filter (where f.was_helpful = true) as helpful_count,
    
    -- Time range
    min(l.created_at) as first_execution,
    max(l.created_at) as last_execution
    
from agent_execution_logs l
left join agent_feedback f on l.id = f.execution_log_id
where l.created_at > now() - interval '30 days'
group by agent_id, agent_name, agent_category;

create unique index if not exists idx_agent_perf_metrics_agent 
    on agent_performance_metrics (agent_id);

-- Refresh function
create or replace function refresh_agent_performance_metrics()
returns void as $$
begin
    refresh materialized view concurrently agent_performance_metrics;
end;
$$ language plpgsql;

-- ============================================================================
-- 5. Real-time Agent Activity View
-- ============================================================================

create or replace view agent_activity_realtime as
select 
    l.id,
    l.agent_id,
    l.agent_name,
    l.agent_category,
    l.user_query,
    l.started_at,
    l.completed_at,
    l.duration_ms,
    l.status,
    l.rag_enabled,
    l.rag_chunks_used,
    l.rag_top_similarity,
    l.llm_model,
    l.llm_tokens_total,
    l.confidence_score,
    f.rating as user_rating,
    f.was_helpful as user_helpful_feedback
from agent_execution_logs l
left join agent_feedback f on l.id = f.execution_log_id
where l.created_at > now() - interval '1 hour'
order by l.started_at desc;

-- ============================================================================
-- 6. Agent Error Analysis View
-- ============================================================================

create or replace view agent_error_analysis as
select 
    agent_id,
    agent_name,
    error_message,
    count(*) as error_count,
    max(created_at) as last_occurrence,
    array_agg(distinct user_query order by user_query) filter (where user_query is not null) as sample_queries
from agent_execution_logs
where status = 'error'
  and created_at > now() - interval '7 days'
group by agent_id, agent_name, error_message
order by error_count desc;

-- ============================================================================
-- 7. RAG Coverage Analysis
-- ============================================================================

create or replace view rag_coverage_analysis as
select 
    search_category,
    search_jurisdiction,
    count(*) as query_count,
    avg(avg_similarity) as avg_similarity,
    count(*) filter (where top_similarity < 0.5) as low_similarity_count,
    count(*) filter (where chunks_returned = 0) as no_results_count,
    array_agg(distinct agent_id) as agents_using
from agent_rag_usage
where created_at > now() - interval '7 days'
group by search_category, search_jurisdiction
order by query_count desc;

-- ============================================================================
-- 8. Daily Agent Statistics
-- ============================================================================

create table if not exists agent_daily_stats (
    id bigserial primary key,
    
    date date not null,
    agent_id text not null,
    
    -- Execution stats
    total_executions integer not null default 0,
    successful_executions integer not null default 0,
    failed_executions integer not null default 0,
    
    -- Performance
    avg_duration_ms integer,
    p95_duration_ms integer,
    
    -- RAG stats
    rag_queries integer not null default 0,
    avg_rag_similarity numeric(5,4),
    
    -- Cost
    total_cost_usd numeric(10,6),
    total_tokens integer,
    
    -- Quality
    avg_confidence numeric(3,2),
    avg_rating numeric(3,2),
    
    unique(date, agent_id)
);

create index if not exists idx_agent_daily_stats_date 
    on agent_daily_stats (date desc);

create index if not exists idx_agent_daily_stats_agent 
    on agent_daily_stats (agent_id);

-- Function to aggregate daily stats
create or replace function aggregate_agent_daily_stats(target_date date)
returns void as $$
begin
    insert into agent_daily_stats (
        date,
        agent_id,
        total_executions,
        successful_executions,
        failed_executions,
        avg_duration_ms,
        p95_duration_ms,
        rag_queries,
        avg_rag_similarity,
        total_cost_usd,
        total_tokens,
        avg_confidence,
        avg_rating
    )
    select 
        target_date,
        l.agent_id,
        count(*),
        count(*) filter (where status = 'success'),
        count(*) filter (where status = 'error'),
        avg(duration_ms)::integer,
        percentile_cont(0.95) within group (order by duration_ms)::integer,
        count(*) filter (where rag_enabled = true),
        avg(rag_top_similarity),
        sum(llm_cost_usd),
        sum(llm_tokens_total),
        avg(confidence_score),
        avg(f.rating)
    from agent_execution_logs l
    left join agent_feedback f on l.id = f.execution_log_id
    where l.created_at::date = target_date
    group by l.agent_id
    on conflict (date, agent_id) do update set
        total_executions = excluded.total_executions,
        successful_executions = excluded.successful_executions,
        failed_executions = excluded.failed_executions,
        avg_duration_ms = excluded.avg_duration_ms,
        p95_duration_ms = excluded.p95_duration_ms,
        rag_queries = excluded.rag_queries,
        avg_rag_similarity = excluded.avg_rag_similarity,
        total_cost_usd = excluded.total_cost_usd,
        total_tokens = excluded.total_tokens,
        avg_confidence = excluded.avg_confidence,
        avg_rating = excluded.avg_rating;
end;
$$ language plpgsql;

-- ============================================================================
-- 9. RLS Policies
-- ============================================================================

alter table agent_execution_logs enable row level security;
alter table agent_feedback enable row level security;
alter table agent_rag_usage enable row level security;
alter table agent_daily_stats enable row level security;

-- Service role has full access
create policy "Service role full access to agent_execution_logs"
    on agent_execution_logs for all
    using (auth.role() = 'service_role');

create policy "Service role full access to agent_feedback"
    on agent_feedback for all
    using (auth.role() = 'service_role');

create policy "Service role full access to agent_rag_usage"
    on agent_rag_usage for all
    using (auth.role() = 'service_role');

create policy "Service role full access to agent_daily_stats"
    on agent_daily_stats for all
    using (auth.role() = 'service_role');

-- Authenticated users can read their own org's data
create policy "Users can read their org agent logs"
    on agent_execution_logs for select
    using (
        auth.uid() is not null 
        and organization_id = (
            select organization_id from users where id = auth.uid()
        )
    );

create policy "Users can insert feedback"
    on agent_feedback for insert
    with check (auth.uid() = user_id);

create policy "Users can read feedback"
    on agent_feedback for select
    using (auth.uid() is not null);

-- ============================================================================
-- 10. Helper Functions
-- ============================================================================

-- Log agent execution
create or replace function log_agent_execution(
    p_agent_id text,
    p_agent_name text,
    p_agent_version text,
    p_agent_category text,
    p_user_query text,
    p_organization_id uuid default null,
    p_user_id uuid default null,
    p_session_id text default null
)
returns bigint as $$
declare
    v_log_id bigint;
begin
    insert into agent_execution_logs (
        agent_id,
        agent_name,
        agent_version,
        agent_category,
        user_query,
        organization_id,
        user_id,
        session_id,
        status
    ) values (
        p_agent_id,
        p_agent_name,
        p_agent_version,
        p_agent_category,
        p_user_query,
        p_organization_id,
        p_user_id,
        p_session_id,
        'pending'
    )
    returning id into v_log_id;
    
    return v_log_id;
end;
$$ language plpgsql security definer;

-- Complete agent execution
create or replace function complete_agent_execution(
    p_log_id bigint,
    p_status text,
    p_duration_ms integer,
    p_response_data jsonb default '{}'::jsonb
)
returns void as $$
begin
    update agent_execution_logs set
        status = p_status,
        completed_at = now(),
        duration_ms = p_duration_ms,
        rag_enabled = (p_response_data->>'rag_enabled')::boolean,
        rag_chunks_used = (p_response_data->>'rag_chunks_used')::integer,
        rag_avg_similarity = (p_response_data->>'rag_avg_similarity')::numeric,
        rag_top_similarity = (p_response_data->>'rag_top_similarity')::numeric,
        llm_model = p_response_data->>'llm_model',
        llm_tokens_total = (p_response_data->>'llm_tokens_total')::integer,
        llm_cost_usd = (p_response_data->>'llm_cost_usd')::numeric,
        has_citations = (p_response_data->>'has_citations')::boolean,
        citation_count = (p_response_data->>'citation_count')::integer,
        confidence_score = (p_response_data->>'confidence_score')::numeric,
        error_message = p_response_data->>'error_message'
    where id = p_log_id;
end;
$$ language plpgsql security definer;

-- Grant execute permissions
grant execute on function log_agent_execution to authenticated, service_role;
grant execute on function complete_agent_execution to authenticated, service_role;
grant execute on function refresh_agent_performance_metrics to service_role;
grant execute on function aggregate_agent_daily_stats to service_role;

-- ============================================================================
-- 11. Comments
-- ============================================================================

comment on table agent_execution_logs is 'Tracks every agent execution with performance and quality metrics';
comment on table agent_feedback is 'User feedback and ratings for agent responses';
comment on table agent_rag_usage is 'Detailed RAG usage tracking for knowledge base optimization';
comment on table agent_daily_stats is 'Pre-aggregated daily statistics for fast dashboard queries';
comment on materialized view agent_performance_metrics is 'Performance metrics per agent (refresh hourly)';
comment on view agent_activity_realtime is 'Real-time view of recent agent activity';
comment on view agent_error_analysis is 'Error patterns and troubleshooting insights';
comment on view rag_coverage_analysis is 'RAG knowledge base coverage analysis';

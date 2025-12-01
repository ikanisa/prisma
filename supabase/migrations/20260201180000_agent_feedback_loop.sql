-- Agent Feedback Loop Schema
-- Self-learning system that improves agents over time

-- ============================================================================
-- 1. Agent Learning Events
-- ============================================================================

create table if not exists agent_learning_events (
    id bigserial primary key,
    
    -- Source execution
    execution_log_id bigint references agent_execution_logs(id) on delete cascade,
    
    -- Learning event type
    event_type text not null,
    -- Types: 'low_similarity', 'user_correction', 'high_rating', 'citation_added', 
    --        'new_pattern', 'classification_improved', 'knowledge_gap'
    
    -- Event details
    trigger_condition text not null, -- What triggered this learning event
    confidence_score numeric(3,2), -- 0-1 confidence in this learning
    
    -- Learning data
    original_query text not null,
    original_response text,
    user_feedback_data jsonb default '{}'::jsonb,
    
    -- Improvements suggested
    suggested_action text not null,
    -- Actions: 'add_knowledge_source', 'reclassify_query', 'update_tags', 
    --          'adjust_similarity_threshold', 'add_to_training_set'
    
    action_params jsonb default '{}'::jsonb,
    
    -- Status
    status text not null default 'pending',
    -- Status: 'pending', 'applied', 'rejected', 'superseded'
    
    applied_at timestamptz,
    applied_by uuid,
    
    -- Metadata
    agent_id text not null,
    agent_category text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_learning_events_execution 
    on agent_learning_events (execution_log_id);

create index if not exists idx_learning_events_type 
    on agent_learning_events (event_type);

create index if not exists idx_learning_events_status 
    on agent_learning_events (status);

create index if not exists idx_learning_events_agent 
    on agent_learning_events (agent_id);

-- ============================================================================
-- 2. Knowledge Source Suggestions
-- ============================================================================

create table if not exists knowledge_source_suggestions (
    id bigserial primary key,
    
    -- Suggestion source
    learning_event_id bigint references agent_learning_events(id) on delete cascade,
    
    -- Suggested source
    suggested_url text not null,
    suggested_category text not null,
    suggested_jurisdiction text,
    suggested_tags text[],
    
    -- Reasoning
    reason text not null,
    confidence_score numeric(3,2),
    
    -- Supporting evidence
    query_patterns text[], -- Similar queries that would benefit
    gap_analysis jsonb, -- What's missing in current knowledge base
    
    -- Review status
    status text not null default 'pending',
    -- Status: 'pending', 'approved', 'rejected', 'added'
    
    reviewed_at timestamptz,
    reviewed_by uuid,
    review_notes text,
    
    -- If added, link to source
    knowledge_source_id uuid references knowledge_web_sources(id),
    
    created_at timestamptz not null default now()
);

create index if not exists idx_source_suggestions_status 
    on knowledge_source_suggestions (status);

create index if not exists idx_source_suggestions_category 
    on knowledge_source_suggestions (suggested_category, suggested_jurisdiction);

-- ============================================================================
-- 3. Classification Improvements
-- ============================================================================

create table if not exists classification_improvements (
    id bigserial primary key,
    
    -- Source
    learning_event_id bigint references agent_learning_events(id) on delete cascade,
    
    -- Original classification
    original_query text not null,
    original_category text,
    original_jurisdiction text,
    original_tags text[],
    
    -- Suggested classification
    suggested_category text,
    suggested_jurisdiction text,
    suggested_tags text[],
    
    -- Reasoning
    reason text not null,
    confidence_score numeric(3,2),
    
    -- Supporting evidence
    similar_queries jsonb, -- Similar queries with better classifications
    user_feedback_count integer default 0,
    
    -- Status
    status text not null default 'pending',
    -- Status: 'pending', 'applied', 'rejected'
    
    applied_at timestamptz,
    
    created_at timestamptz not null default now()
);

create index if not exists idx_classification_improvements_status 
    on classification_improvements (status);

-- ============================================================================
-- 4. RAG Search Optimizations
-- ============================================================================

create table if not exists rag_search_optimizations (
    id bigserial primary key,
    
    -- Target agent/category
    agent_id text,
    category text,
    jurisdiction text,
    
    -- Current parameters
    current_chunk_limit integer,
    current_similarity_threshold numeric(3,2),
    current_tags text[],
    
    -- Optimized parameters
    optimized_chunk_limit integer,
    optimized_similarity_threshold numeric(3,2),
    optimized_tags text[],
    
    -- Performance improvement expected
    expected_improvement_pct numeric(5,2),
    
    -- Evidence
    based_on_queries integer, -- Number of queries analyzed
    avg_current_similarity numeric(3,2),
    avg_optimized_similarity numeric(3,2),
    
    -- A/B test results
    ab_test_started_at timestamptz,
    ab_test_completed_at timestamptz,
    ab_test_results jsonb,
    
    -- Status
    status text not null default 'testing',
    -- Status: 'testing', 'validated', 'applied', 'rejected'
    
    applied_at timestamptz,
    
    created_at timestamptz not null default now()
);

create index if not exists idx_rag_optimizations_agent 
    on rag_search_optimizations (agent_id);

create index if not exists idx_rag_optimizations_category 
    on rag_search_optimizations (category, jurisdiction);

-- ============================================================================
-- 5. Training Examples (for future ML models)
-- ============================================================================

create table if not exists agent_training_examples (
    id bigserial primary key,
    
    -- Training data
    query text not null,
    category text not null,
    jurisdiction text,
    tags text[],
    
    -- Expected response characteristics
    expected_rag_chunks integer,
    expected_similarity_threshold numeric(3,2),
    
    -- Quality markers
    is_high_quality boolean default true,
    user_rating numeric(3,2),
    
    -- Source
    source_execution_log_id bigint references agent_execution_logs(id) on delete set null,
    source_type text, -- 'user_feedback', 'high_rating', 'expert_review'
    
    -- Metadata
    added_at timestamptz not null default now(),
    last_used_at timestamptz,
    use_count integer default 0
);

create index if not exists idx_training_examples_category 
    on agent_training_examples (category, jurisdiction);

create index if not exists idx_training_examples_quality 
    on agent_training_examples (is_high_quality, user_rating desc);

-- ============================================================================
-- 6. Feedback Loop Metrics
-- ============================================================================

create table if not exists feedback_loop_metrics (
    id bigserial primary key,
    
    date date not null,
    
    -- Learning events
    total_learning_events integer default 0,
    events_by_type jsonb default '{}'::jsonb,
    
    -- Actions taken
    knowledge_sources_added integer default 0,
    classifications_improved integer default 0,
    rag_optimizations_applied integer default 0,
    
    -- Impact
    avg_similarity_improvement numeric(5,4),
    avg_rating_improvement numeric(3,2),
    cost_reduction_pct numeric(5,2),
    
    -- Training set growth
    training_examples_added integer default 0,
    
    unique(date)
);

create index if not exists idx_feedback_loop_metrics_date 
    on feedback_loop_metrics (date desc);

-- ============================================================================
-- 7. Auto-Learning Functions
-- ============================================================================

-- Detect low similarity queries that need new knowledge sources
create or replace function detect_knowledge_gaps()
returns table(
    query_pattern text,
    category text,
    jurisdiction text,
    query_count bigint,
    avg_similarity numeric
) as $$
begin
    return query
    select 
        substring(user_query, 1, 100) as query_pattern,
        search_category as category,
        search_jurisdiction as jurisdiction,
        count(*) as query_count,
        avg(top_similarity) as avg_similarity
    from agent_rag_usage
    where 
        created_at > now() - interval '7 days'
        and top_similarity < 0.5
    group by 
        substring(user_query, 1, 100),
        search_category,
        search_jurisdiction
    having count(*) >= 3
    order by query_count desc, avg_similarity asc
    limit 20;
end;
$$ language plpgsql;

-- Suggest classification improvements based on patterns
create or replace function suggest_classification_improvements()
returns table(
    query text,
    current_category text,
    suggested_category text,
    confidence numeric,
    reason text
) as $$
begin
    -- Find queries with low similarity but high ratings
    -- (suggests good content despite poor classification)
    return query
    select 
        l.user_query as query,
        l.agent_category as current_category,
        -- Suggest category based on successful similar queries
        (
            select r2.search_category
            from agent_rag_usage r2
            where r2.top_similarity > 0.8
            and similarity(r2.user_query, l.user_query) > 0.6
            limit 1
        ) as suggested_category,
        0.75 as confidence,
        'Low RAG similarity but high user rating suggests better category exists' as reason
    from agent_execution_logs l
    join agent_feedback f on l.id = f.execution_log_id
    join agent_rag_usage r on l.id = r.execution_log_id
    where 
        l.created_at > now() - interval '7 days'
        and f.rating >= 4
        and r.top_similarity < 0.5
    limit 10;
end;
$$ language plpgsql;

-- Optimize RAG parameters based on performance data
create or replace function optimize_rag_parameters(p_agent_id text)
returns table(
    current_limit integer,
    optimized_limit integer,
    current_threshold numeric,
    optimized_threshold numeric,
    expected_improvement_pct numeric
) as $$
declare
    v_current_avg_similarity numeric;
    v_optimal_threshold numeric;
begin
    -- Analyze successful queries to find optimal parameters
    select 
        avg(rag_top_similarity)
    into v_current_avg_similarity
    from agent_execution_logs
    where 
        agent_id = p_agent_id
        and status = 'success'
        and created_at > now() - interval '30 days';
    
    -- Find threshold that maximizes success rate
    select 
        percentile_cont(0.3) within group (order by rag_top_similarity)
    into v_optimal_threshold
    from agent_execution_logs l
    join agent_feedback f on l.id = f.execution_log_id
    where 
        l.agent_id = p_agent_id
        and f.rating >= 4
        and l.created_at > now() - interval '30 days';
    
    return query
    select 
        10 as current_limit,
        15 as optimized_limit,
        0.5::numeric as current_threshold,
        coalesce(v_optimal_threshold, 0.5)::numeric as optimized_threshold,
        ((v_optimal_threshold - v_current_avg_similarity) / v_current_avg_similarity * 100)::numeric 
            as expected_improvement_pct;
end;
$$ language plpgsql;

-- Create learning event from feedback
create or replace function create_learning_event(
    p_execution_log_id bigint,
    p_event_type text,
    p_trigger_condition text,
    p_suggested_action text,
    p_action_params jsonb default '{}'::jsonb
)
returns bigint as $$
declare
    v_event_id bigint;
    v_agent_id text;
    v_agent_category text;
    v_user_query text;
begin
    -- Get execution details
    select 
        agent_id,
        agent_category,
        user_query
    into v_agent_id, v_agent_category, v_user_query
    from agent_execution_logs
    where id = p_execution_log_id;
    
    -- Create learning event
    insert into agent_learning_events (
        execution_log_id,
        event_type,
        trigger_condition,
        confidence_score,
        original_query,
        suggested_action,
        action_params,
        agent_id,
        agent_category
    ) values (
        p_execution_log_id,
        p_event_type,
        p_trigger_condition,
        0.8, -- Default confidence
        v_user_query,
        p_suggested_action,
        p_action_params,
        v_agent_id,
        v_agent_category
    )
    returning id into v_event_id;
    
    return v_event_id;
end;
$$ language plpgsql security definer;

-- Apply learning event (execute suggested action)
create or replace function apply_learning_event(
    p_event_id bigint,
    p_applied_by uuid default null
)
returns boolean as $$
declare
    v_action text;
    v_params jsonb;
begin
    -- Get event details
    select suggested_action, action_params
    into v_action, v_params
    from agent_learning_events
    where id = p_event_id and status = 'pending';
    
    if not found then
        return false;
    end if;
    
    -- Execute action based on type
    case v_action
        when 'add_knowledge_source' then
            -- Create suggestion for review
            insert into knowledge_source_suggestions (
                learning_event_id,
                suggested_url,
                suggested_category,
                suggested_jurisdiction,
                reason,
                confidence_score
            ) values (
                p_event_id,
                v_params->>'url',
                v_params->>'category',
                v_params->>'jurisdiction',
                v_params->>'reason',
                (v_params->>'confidence')::numeric
            );
            
        when 'reclassify_query' then
            -- Create classification improvement
            insert into classification_improvements (
                learning_event_id,
                original_query,
                suggested_category,
                suggested_jurisdiction,
                reason,
                confidence_score
            )
            select 
                p_event_id,
                user_query,
                v_params->>'category',
                v_params->>'jurisdiction',
                v_params->>'reason',
                (v_params->>'confidence')::numeric
            from agent_execution_logs
            where id = (
                select execution_log_id 
                from agent_learning_events 
                where id = p_event_id
            );
            
        else
            -- Unknown action type
            return false;
    end case;
    
    -- Mark as applied
    update agent_learning_events
    set 
        status = 'applied',
        applied_at = now(),
        applied_by = p_applied_by
    where id = p_event_id;
    
    return true;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 8. RLS Policies
-- ============================================================================

alter table agent_learning_events enable row level security;
alter table knowledge_source_suggestions enable row level security;
alter table classification_improvements enable row level security;
alter table rag_search_optimizations enable row level security;
alter table agent_training_examples enable row level security;
alter table feedback_loop_metrics enable row level security;

-- Service role full access
create policy "Service role full access to learning events"
    on agent_learning_events for all
    using (auth.role() = 'service_role');

create policy "Service role full access to source suggestions"
    on knowledge_source_suggestions for all
    using (auth.role() = 'service_role');

create policy "Service role full access to classification improvements"
    on classification_improvements for all
    using (auth.role() = 'service_role');

create policy "Service role full access to rag optimizations"
    on rag_search_optimizations for all
    using (auth.role() = 'service_role');

create policy "Service role full access to training examples"
    on agent_training_examples for all
    using (auth.role() = 'service_role');

create policy "Service role full access to feedback metrics"
    on feedback_loop_metrics for all
    using (auth.role() = 'service_role');

-- Admins can read all learning data
create policy "Admins can read learning events"
    on agent_learning_events for select
    using (
        auth.uid() in (
            select id from users where role = 'admin'
        )
    );

-- Grant function permissions
grant execute on function detect_knowledge_gaps to service_role;
grant execute on function suggest_classification_improvements to service_role;
grant execute on function optimize_rag_parameters to service_role;
grant execute on function create_learning_event to service_role, authenticated;
grant execute on function apply_learning_event to service_role;

-- ============================================================================
-- 9. Comments
-- ============================================================================

comment on table agent_learning_events is 'Captures learning opportunities from agent executions';
comment on table knowledge_source_suggestions is 'Suggested new sources to add based on knowledge gaps';
comment on table classification_improvements is 'Suggested improvements to query classification';
comment on table rag_search_optimizations is 'Optimized RAG search parameters based on performance';
comment on table agent_training_examples is 'High-quality examples for training ML models';
comment on table feedback_loop_metrics is 'Metrics tracking feedback loop effectiveness';

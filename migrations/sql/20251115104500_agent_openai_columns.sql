set check_function_bodies = off;

ALTER TABLE IF EXISTS public.agent_sessions
  ADD COLUMN IF NOT EXISTS openai_agent_id text,
  ADD COLUMN IF NOT EXISTS openai_thread_id text;

ALTER TABLE IF EXISTS public.agent_runs
  ADD COLUMN IF NOT EXISTS openai_run_id text,
  ADD COLUMN IF NOT EXISTS openai_response_id text;

CREATE INDEX IF NOT EXISTS idx_agent_sessions_openai_thread
  ON public.agent_sessions(openai_thread_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_openai_run
  ON public.agent_runs(openai_run_id);

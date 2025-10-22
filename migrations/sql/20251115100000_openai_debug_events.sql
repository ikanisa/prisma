-- OpenAI debug events table for logging request metadata
set check_function_bodies = off;

CREATE TABLE IF NOT EXISTS public.openai_debug_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  model text,
  endpoint text NOT NULL,
  status_code integer,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  debug jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_openai_debug_request_id
  ON public.openai_debug_events(request_id);

ALTER TABLE public.openai_debug_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS openai_debug_events_select ON public.openai_debug_events;
CREATE POLICY openai_debug_events_select ON public.openai_debug_events
  FOR SELECT USING (public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level) OR org_id IS NULL);

DROP POLICY IF EXISTS openai_debug_events_insert ON public.openai_debug_events;
CREATE POLICY openai_debug_events_insert ON public.openai_debug_events
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level) OR org_id IS NULL);

DROP POLICY IF EXISTS openai_debug_events_delete ON public.openai_debug_events;
CREATE POLICY openai_debug_events_delete ON public.openai_debug_events
  FOR DELETE USING (public.has_min_role(org_id, 'SYSTEM_ADMIN'::public.role_level));


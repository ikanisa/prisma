BEGIN;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  service text,
  source text NOT NULL,
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_event ON public.analytics_events(org_id, event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred_at ON public.analytics_events(occurred_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_events_service_role ON public.analytics_events;
CREATE POLICY analytics_events_service_role
  ON public.analytics_events
  FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS analytics_events_member_read ON public.analytics_events;
CREATE POLICY analytics_events_member_read
  ON public.analytics_events
  FOR SELECT
  USING (public.is_member_of(org_id) OR org_id IS NULL);

COMMIT;

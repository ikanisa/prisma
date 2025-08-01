-- STEP 6:  Journey Engine – core table & enum
-- ------------------------------------------------------------
-- 1.  ENUM TYPE: journey_status
-- ------------------------------------------------------------
--    Re-usable status indicator for a user journey lifecycle.
--    Using a dedicated ENUM keeps the column strongly typed and
--    allows future migrations to extend the list safely via
--    `ALTER TYPE … ADD VALUE …`.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'journey_status') THEN
        CREATE TYPE public.journey_status AS ENUM ('active', 'completed', 'abandoned', 'error');
    END IF;
END$$;

-- ------------------------------------------------------------
-- 2.  TABLE: user_journeys
-- ------------------------------------------------------------
--    High-level tracking record for each end-user journey that the
--    Journey Engine orchestrates.  A journey groups one-or-many
--    conversation flows and provides aggregated analytics.

CREATE TABLE IF NOT EXISTS public.user_journeys (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number    text        NOT NULL,
    journey_name    text        NOT NULL,
    status          public.journey_status DEFAULT 'active',
    current_step    text,
    steps           jsonb       DEFAULT '{}'::jsonb,
    started_at      timestamptz DEFAULT NOW(),
    completed_at    timestamptz,
    last_updated    timestamptz DEFAULT NOW(),
    extra_metadata  jsonb       DEFAULT '{}'::jsonb
);

-- Helpful indexes for quick filtering & look-ups
CREATE INDEX IF NOT EXISTS idx_user_journeys_phone   ON public.user_journeys(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_journeys_status  ON public.user_journeys(status);
CREATE INDEX IF NOT EXISTS idx_user_journeys_started ON public.user_journeys(started_at);

-- ------------------------------------------------------------
-- 3.  Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.user_journeys ENABLE ROW LEVEL SECURITY;

--   Allow the supabase service role / backend to manage the table.
CREATE POLICY "System can manage user_journeys"
    ON public.user_journeys
    FOR ALL
    USING (true)
    WITH CHECK (true);

--   Optional read-only access for admin role (if is_admin() helper exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        CREATE POLICY "Admin can view user_journeys"
            ON public.user_journeys
            FOR SELECT
            USING (is_admin());
    END IF;
END$$;


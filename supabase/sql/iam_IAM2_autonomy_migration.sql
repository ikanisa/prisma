-- Migration to convert legacy numeric autopilot levels to autonomy_level enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'autonomy_level'
  ) THEN
    CREATE TYPE public.autonomy_level AS ENUM ('L0', 'L1', 'L2', 'L3');
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'autopilot_level'
  ) THEN
    ALTER TABLE public.organizations
      ADD COLUMN IF NOT EXISTS autonomy_level public.autonomy_level;

    UPDATE public.organizations
      SET autonomy_level = COALESCE(autonomy_level,
        CASE autopilot_level
          WHEN 0 THEN 'L0'
          WHEN 1 THEN 'L1'
          WHEN 2 THEN 'L2'
          WHEN 3 THEN 'L3'
          WHEN 4 THEN 'L3'
          WHEN 5 THEN 'L3'
          ELSE 'L2'
        END::public.autonomy_level);

    ALTER TABLE public.organizations
      ALTER COLUMN autonomy_level SET NOT NULL,
      ALTER COLUMN autonomy_level SET DEFAULT 'L2';

    ALTER TABLE public.organizations DROP COLUMN autopilot_level;
  END IF;
END $$;

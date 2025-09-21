-- Independence & NAS gate schema updates
-- Adds independence fields to engagements table and extends approval kinds.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE t.typname = 'approval_kind'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.approval_kind AS ENUM ('JOURNAL_POST', 'PERIOD_LOCK', 'HANDOFF_SEND', 'ARCHIVE_BUILD', 'CLIENT_SEND', 'AGENT_ACTION', 'INDEPENDENCE_OVERRIDE');
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'approval_kind'
      AND e.enumlabel = 'INDEPENDENCE_OVERRIDE'
  ) THEN
    ALTER TYPE public.approval_kind ADD VALUE 'INDEPENDENCE_OVERRIDE';
  END IF;
END
$$;

ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS is_audit_client BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_eqr BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS non_audit_services JSONB,
  ADD COLUMN IF NOT EXISTS independence_checked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS independence_conclusion TEXT NOT NULL DEFAULT 'OK',
  ADD COLUMN IF NOT EXISTS independence_conclusion_note TEXT;


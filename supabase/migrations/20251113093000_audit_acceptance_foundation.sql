-- Align acceptance and independence tables with remote schema
set check_function_bodies = off;

-- Enumerations ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'background_risk_rating'
  ) THEN
    CREATE TYPE public.background_risk_rating AS ENUM ('LOW','MEDIUM','HIGH','UNKNOWN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'independence_conclusion'
  ) THEN
    CREATE TYPE public.independence_conclusion AS ENUM ('OK','SAFEGUARDS_REQUIRED','PROHIBITED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'acceptance_decision'
  ) THEN
    CREATE TYPE public.acceptance_decision AS ENUM ('ACCEPT','DECLINE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'acceptance_status'
  ) THEN
    CREATE TYPE public.acceptance_status AS ENUM ('DRAFT','APPROVED','REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'approval_status'
  ) THEN
    CREATE TYPE public.approval_status AS ENUM ('PENDING','APPROVED','REJECTED','CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'approval_stage'
  ) THEN
    CREATE TYPE public.approval_stage AS ENUM ('MANAGER','PARTNER','EQR');
  END IF;
END $$;

-- Tables -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_background_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  screenings jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_rating public.background_risk_rating NOT NULL DEFAULT 'UNKNOWN',
  notes text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_background_check_client
  ON public.client_background_checks(org_id, client_id);

CREATE TABLE IF NOT EXISTS public.independence_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  threats jsonb NOT NULL DEFAULT '[]'::jsonb,
  safeguards jsonb NOT NULL DEFAULT '[]'::jsonb,
  conclusion public.independence_conclusion NOT NULL DEFAULT 'OK',
  prepared_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_independence_assessment_client
  ON public.independence_assessments(org_id, client_id);

CREATE TABLE IF NOT EXISTS public.acceptance_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  decision public.acceptance_decision NOT NULL DEFAULT 'ACCEPT',
  eqr_required boolean NOT NULL DEFAULT false,
  rationale text,
  status public.acceptance_status NOT NULL DEFAULT 'DRAFT',
  approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acceptance_unique_engagement UNIQUE (engagement_id)
);

CREATE INDEX IF NOT EXISTS idx_acceptance_decisions_org_eng
  ON public.acceptance_decisions(org_id, engagement_id);

CREATE TABLE IF NOT EXISTS public.approval_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  kind text NOT NULL,
  stage public.approval_stage NOT NULL,
  status public.approval_status NOT NULL DEFAULT 'PENDING',
  candidate_id uuid REFERENCES public.kam_candidates(id) ON DELETE CASCADE,
  draft_id uuid REFERENCES public.kam_drafts(id) ON DELETE CASCADE,
  assignee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text,
  CONSTRAINT approval_queue_target CHECK (
    (kind = 'KAM_DRAFT' AND draft_id IS NOT NULL) OR kind <> 'KAM_DRAFT'
  )
);

CREATE INDEX IF NOT EXISTS idx_approval_queue_org_status
  ON public.approval_queue(org_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_engagement
  ON public.approval_queue(engagement_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_stage
  ON public.approval_queue(stage);

-- Triggers ---------------------------------------------------------------
CREATE TRIGGER trg_independence_assessments_touch
  BEFORE UPDATE ON public.independence_assessments
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_acceptance_decisions_touch
  BEFORE UPDATE ON public.acceptance_decisions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_approval_queue_touch
  BEFORE UPDATE ON public.approval_queue
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Data migration ---------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.independence_checks') IS NOT NULL THEN
    INSERT INTO public.independence_assessments (id, org_id, client_id, threats, safeguards, conclusion, prepared_at, updated_at)
    SELECT
      id,
      org_id,
      NULLIF(client_id, '')::uuid,
      COALESCE(threats, '[]'::jsonb),
      COALESCE(safeguards, '[]'::jsonb),
      CASE upper(COALESCE(conclusion, 'OK'))
        WHEN 'PROHIBITED' THEN 'PROHIBITED'::public.independence_conclusion
        WHEN 'SAFEGUARDS_REQUIRED' THEN 'SAFEGUARDS_REQUIRED'::public.independence_conclusion
        ELSE 'OK'::public.independence_conclusion
      END,
      COALESCE(created_at, now()),
      COALESCE(created_at, now())
    FROM public.independence_checks
    WHERE client_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ON CONFLICT (org_id, client_id) DO UPDATE
      SET
        threats = EXCLUDED.threats,
        safeguards = EXCLUDED.safeguards,
        conclusion = EXCLUDED.conclusion,
        updated_at = now();

    DROP TABLE public.independence_checks;
  END IF;
END $$;

-- Row level security -----------------------------------------------------
ALTER TABLE public.client_background_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS background_checks_select ON public.client_background_checks;
CREATE POLICY background_checks_select ON public.client_background_checks
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS background_checks_write ON public.client_background_checks;
CREATE POLICY background_checks_write ON public.client_background_checks
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS background_checks_update ON public.client_background_checks;
CREATE POLICY background_checks_update ON public.client_background_checks
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

ALTER TABLE public.independence_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS independence_select ON public.independence_assessments;
CREATE POLICY independence_select ON public.independence_assessments
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS independence_write ON public.independence_assessments;
CREATE POLICY independence_write ON public.independence_assessments
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS independence_update ON public.independence_assessments;
CREATE POLICY independence_update ON public.independence_assessments
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));

ALTER TABLE public.acceptance_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS acceptance_select ON public.acceptance_decisions;
CREATE POLICY acceptance_select ON public.acceptance_decisions
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS acceptance_insert ON public.acceptance_decisions;
CREATE POLICY acceptance_insert ON public.acceptance_decisions
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS acceptance_update ON public.acceptance_decisions;
CREATE POLICY acceptance_update ON public.acceptance_decisions
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS acceptance_delete ON public.acceptance_decisions;
CREATE POLICY acceptance_delete ON public.acceptance_decisions
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

ALTER TABLE public.approval_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approval_queue_select ON public.approval_queue;
CREATE POLICY approval_queue_select ON public.approval_queue
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS approval_queue_write ON public.approval_queue;
CREATE POLICY approval_queue_write ON public.approval_queue
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS approval_queue_update ON public.approval_queue;
CREATE POLICY approval_queue_update ON public.approval_queue
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level))
  WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'::public.role_level));
DROP POLICY IF EXISTS approval_queue_delete ON public.approval_queue;
CREATE POLICY approval_queue_delete ON public.approval_queue
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

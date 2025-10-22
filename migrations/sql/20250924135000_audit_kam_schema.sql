set check_function_bodies = off;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'estimate_uncertainty_level'
  ) THEN
    CREATE TYPE public.estimate_uncertainty_level AS ENUM (
      'LOW',
      'MODERATE',
      'HIGH',
      'SIGNIFICANT'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'going_concern_assessment'
  ) THEN
    CREATE TYPE public.going_concern_assessment AS ENUM (
      'STABLE',
      'SIGNIFICANT_DOUBT',
      'MATERIAL_UNCERTAINTY'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'kam_candidate_source'
  ) THEN
    CREATE TYPE public.kam_candidate_source AS ENUM (
      'RISK',
      'ESTIMATE',
      'GOING_CONCERN',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'kam_candidate_status'
  ) THEN
    CREATE TYPE public.kam_candidate_status AS ENUM (
      'CANDIDATE',
      'SELECTED',
      'EXCLUDED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'kam_draft_status'
  ) THEN
    CREATE TYPE public.kam_draft_status AS ENUM (
      'DRAFT',
      'READY_FOR_REVIEW',
      'APPROVED',
      'REJECTED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.estimate_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  caption text NOT NULL,
  description text,
  basis text,
  uncertainty_level public.estimate_uncertainty_level NOT NULL DEFAULT 'LOW',
  management_assessment text,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_register_org_eng ON public.estimate_register(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_estimate_register_uncertainty ON public.estimate_register(uncertainty_level);

CREATE TRIGGER trg_estimate_register_touch
  BEFORE UPDATE ON public.estimate_register
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.going_concern_worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  assessment public.going_concern_assessment NOT NULL DEFAULT 'STABLE',
  indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  conclusion text,
  mitigation_actions text,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gc_worksheets_org_eng ON public.going_concern_worksheets(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_gc_worksheets_assessment ON public.going_concern_worksheets(assessment);

CREATE TRIGGER trg_gc_worksheets_touch
  BEFORE UPDATE ON public.going_concern_worksheets
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.audit_planned_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  risk_id uuid REFERENCES public.risks(id) ON DELETE SET NULL,
  title text NOT NULL,
  objective text,
  isa_references text[] NOT NULL DEFAULT '{}',
  notes text,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planned_procedures_org_eng ON public.audit_planned_procedures(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_planned_procedures_risk ON public.audit_planned_procedures(risk_id) WHERE risk_id IS NOT NULL;

CREATE TRIGGER trg_planned_procedures_touch
  BEFORE UPDATE ON public.audit_planned_procedures
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.audit_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES public.audit_planned_procedures(id) ON DELETE SET NULL,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  workpaper_id uuid REFERENCES public.workpapers(id) ON DELETE SET NULL,
  description text,
  obtained_at timestamptz,
  prepared_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_evidence_org_eng ON public.audit_evidence(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_audit_evidence_procedure ON public.audit_evidence(procedure_id);

CREATE TRIGGER trg_audit_evidence_touch
  BEFORE UPDATE ON public.audit_evidence
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.kam_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  source public.kam_candidate_source NOT NULL DEFAULT 'OTHER',
  risk_id uuid REFERENCES public.risks(id) ON DELETE SET NULL,
  estimate_id uuid REFERENCES public.estimate_register(id) ON DELETE SET NULL,
  going_concern_id uuid REFERENCES public.going_concern_worksheets(id) ON DELETE SET NULL,
  title text NOT NULL,
  rationale text,
  status public.kam_candidate_status NOT NULL DEFAULT 'CANDIDATE',
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kam_candidates_source_fk CHECK (
    (source = 'RISK' AND risk_id IS NOT NULL AND estimate_id IS NULL AND going_concern_id IS NULL) OR
    (source = 'ESTIMATE' AND estimate_id IS NOT NULL AND risk_id IS NULL AND going_concern_id IS NULL) OR
    (source = 'GOING_CONCERN' AND going_concern_id IS NOT NULL AND risk_id IS NULL AND estimate_id IS NULL) OR
    (source = 'OTHER' AND risk_id IS NULL AND estimate_id IS NULL AND going_concern_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_kam_candidates_org_eng ON public.kam_candidates(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_kam_candidates_status ON public.kam_candidates(status);
CREATE INDEX IF NOT EXISTS idx_kam_candidates_risk ON public.kam_candidates(risk_id) WHERE risk_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kam_candidates_estimate ON public.kam_candidates(estimate_id) WHERE estimate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kam_candidates_gc ON public.kam_candidates(going_concern_id) WHERE going_concern_id IS NOT NULL;

CREATE TRIGGER trg_kam_candidates_touch
  BEFORE UPDATE ON public.kam_candidates
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_kam_candidate_risk
  ON public.kam_candidates(engagement_id, risk_id)
  WHERE risk_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kam_candidate_estimate
  ON public.kam_candidates(engagement_id, estimate_id)
  WHERE estimate_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kam_candidate_gc
  ON public.kam_candidates(engagement_id, going_concern_id)
  WHERE going_concern_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.kam_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.kam_candidates(id) ON DELETE CASCADE,
  heading text NOT NULL,
  why_kam text,
  how_addressed text,
  procedures_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  results_summary text,
  status public.kam_draft_status NOT NULL DEFAULT 'DRAFT',
  submitted_at timestamptz,
  approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  eqr_approved_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  eqr_approved_at timestamptz,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kam_drafts_refs_are_arrays CHECK (
    jsonb_typeof(procedures_refs) = 'array' AND jsonb_typeof(evidence_refs) = 'array'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kam_draft_candidate ON public.kam_drafts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_kam_drafts_org_eng ON public.kam_drafts(org_id, engagement_id);
CREATE INDEX IF NOT EXISTS idx_kam_drafts_status ON public.kam_drafts(status);

CREATE TRIGGER trg_kam_drafts_touch
  BEFORE UPDATE ON public.kam_drafts
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

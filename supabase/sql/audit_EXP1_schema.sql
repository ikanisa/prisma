-- Specialists reliance assessments (EXP-1)
-- Captures use of external experts and internal audit reliance.

CREATE TYPE IF NOT EXISTS public.specialist_type AS ENUM ('EXTERNAL_SPECIALIST', 'INTERNAL_AUDIT');
CREATE TYPE IF NOT EXISTS public.specialist_conclusion AS ENUM ('RELIED', 'PARTIAL', 'NOT_RELIED', 'PENDING');

CREATE TABLE IF NOT EXISTS public.specialist_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  specialist_kind public.specialist_type NOT NULL,
  name TEXT NOT NULL,
  firm TEXT,
  scope TEXT,
  competence_rationale TEXT,
  objectivity_rationale TEXT,
  work_performed TEXT,
  conclusion public.specialist_conclusion NOT NULL DEFAULT 'PENDING',
  conclusion_notes TEXT,
  memo_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prepared_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specialist_assessments_org_eng ON public.specialist_assessments (org_id, engagement_id, specialist_kind);

CREATE TRIGGER trg_specialist_assessments_touch
  BEFORE UPDATE ON public.specialist_assessments
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

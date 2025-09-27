-- Group audit schema (GRP-1)
-- Stores group components, instructions, workpapers, and review tracking.

CREATE TYPE IF NOT EXISTS public.group_component_significance AS ENUM ('INSIGNIFICANT', 'SIGNIFICANT', 'KEY');
CREATE TYPE IF NOT EXISTS public.group_instruction_status AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETE');
CREATE TYPE IF NOT EXISTS public.group_review_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE');

CREATE TABLE IF NOT EXISTS public.group_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT,
  significance public.group_component_significance NOT NULL DEFAULT 'INSIGNIFICANT',
  materiality NUMERIC(18,2),
  assigned_firm TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_components_org_eng ON public.group_components (org_id, engagement_id);

CREATE TABLE IF NOT EXISTS public.group_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status public.group_instruction_status NOT NULL DEFAULT 'DRAFT',
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_instructions_component ON public.group_instructions (component_id, status);

CREATE TABLE IF NOT EXISTS public.group_workpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,
  instruction_id UUID REFERENCES public.group_instructions(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_group_workpapers_component ON public.group_workpapers (component_id);

CREATE TABLE IF NOT EXISTS public.group_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,
  reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.group_review_status NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_reviews_component ON public.group_reviews (component_id, status);

CREATE TRIGGER trg_group_components_touch
  BEFORE UPDATE ON public.group_components
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_group_instructions_touch
  BEFORE UPDATE ON public.group_instructions
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER trg_group_reviews_touch
  BEFORE UPDATE ON public.group_reviews
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

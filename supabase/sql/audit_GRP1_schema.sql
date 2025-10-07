-- ================================
-- Group audit schema (GRP-1 merged)
-- ================================

-- Enums (from main)
CREATE TYPE IF NOT EXISTS public.group_component_significance
  AS ENUM ('INSIGNIFICANT', 'SIGNIFICANT', 'KEY');

CREATE TYPE IF NOT EXISTS public.group_instruction_status
  AS ENUM ('DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETE');

CREATE TYPE IF NOT EXISTS public.group_review_status
  AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETE');

-- ------------------------
-- Components
-- ------------------------
CREATE TABLE IF NOT EXISTS public.group_components (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id    UUID NOT NULL REFERENCES public.engagements(id)   ON DELETE CASCADE,

  -- codex branch fields
  component_code   TEXT,
  component_name   TEXT NOT NULL,
  component_type   TEXT DEFAULT 'component',
  jurisdiction     TEXT,
  lead_auditor     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'planned',
  risk_level       TEXT DEFAULT 'moderate',
  materiality_scope TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- main branch fields
  country          TEXT,
  significance     public.group_component_significance NOT NULL DEFAULT 'INSIGNIFICANT',
  materiality      NUMERIC(18,2),
  assigned_firm    TEXT,
  notes            TEXT,

  -- common
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS group_components_org_code_idx
  ON public.group_components (org_id, component_code)
  WHERE component_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS group_components_org_eng_idx
  ON public.group_components (org_id, engagement_id);

ALTER TABLE public.group_components ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_group_components_updated_at
  BEFORE UPDATE ON public.group_components
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "group_components_read"   ON public.group_components
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "group_components_insert" ON public.group_components
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "group_components_update" ON public.group_components
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "group_components_delete" ON public.group_components
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- ------------------------
-- Instructions
-- ------------------------
CREATE TABLE IF NOT EXISTS public.group_instructions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id    UUID NOT NULL REFERENCES public.engagements(id)   ON DELETE CASCADE,
  component_id     UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,

  -- codex branch fields
  instruction_title  TEXT NOT NULL,
  instruction_body   TEXT,
  sent_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- unify status/timing with enums from main
  status           public.group_instruction_status NOT NULL DEFAULT 'DRAFT',
  sent_at          TIMESTAMPTZ,
  acknowledged_at  TIMESTAMPTZ,
  due_at           TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_instructions_org_component_idx
  ON public.group_instructions (org_id, component_id);

CREATE INDEX IF NOT EXISTS group_instructions_org_status_idx
  ON public.group_instructions (org_id, status);

ALTER TABLE public.group_instructions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_group_instructions_updated_at
  BEFORE UPDATE ON public.group_instructions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "group_instructions_read" ON public.group_instructions
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "group_instructions_insert" ON public.group_instructions
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

-- Managers can update anything
CREATE POLICY "group_instructions_update_manager" ON public.group_instructions
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

-- Members can acknowledge their own
CREATE POLICY "group_instructions_ack" ON public.group_instructions
  FOR UPDATE USING (public.is_member_of(org_id))
  WITH CHECK (public.is_member_of(org_id) AND acknowledged_by = auth.uid());

-- ------------------------
-- Workpapers (unified name: group_workpapers)
-- ------------------------
CREATE TABLE IF NOT EXISTS public.group_workpapers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id    UUID NOT NULL REFERENCES public.engagements(id)   ON DELETE CASCADE,
  component_id     UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,
  instruction_id   UUID REFERENCES public.group_instructions(id) ON DELETE SET NULL,
  document_id      UUID REFERENCES public.documents(id)         ON DELETE SET NULL,

  title            TEXT NOT NULL,
  notes            TEXT,

  -- codex branch ingestion fields
  status           TEXT DEFAULT 'submitted',
  ingestion_method TEXT DEFAULT 'upload',
  ingested_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- keep metadata pattern
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_workpapers_org_component_idx
  ON public.group_workpapers (org_id, component_id);

CREATE INDEX IF NOT EXISTS group_workpapers_org_status_idx
  ON public.group_workpapers (org_id, status);

ALTER TABLE public.group_workpapers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_group_workpapers_updated_at
  BEFORE UPDATE ON public.group_workpapers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "group_workpapers_read" ON public.group_workpapers
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "group_workpapers_insert" ON public.group_workpapers
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

-- Owner or Manager can update
CREATE POLICY "group_workpapers_update_manager" ON public.group_workpapers
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "group_workpapers_update_owner" ON public.group_workpapers
  FOR UPDATE USING (public.is_member_of(org_id) AND ingested_by = auth.uid())
  WITH CHECK (public.is_member_of(org_id) AND ingested_by = auth.uid());

CREATE POLICY "group_workpapers_delete" ON public.group_workpapers
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- ------------------------
-- Reviews (unified name: group_reviews)
-- ------------------------
CREATE TABLE IF NOT EXISTS public.group_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id    UUID NOT NULL REFERENCES public.engagements(id)   ON DELETE CASCADE,
  component_id     UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,

  -- link to the workpaper if applicable
  workpaper_id     UUID REFERENCES public.group_workpapers(id) ON DELETE SET NULL,

  -- reviewer
  reviewer_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- statuses (enum from main)
  status           public.group_review_status NOT NULL DEFAULT 'PENDING',

  -- timeline fields (keep both flavors)
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at           TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,

  -- sign-off (codex)
  signed_off_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_off_at    TIMESTAMPTZ,

  review_notes     TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_reviews_org_component_idx
  ON public.group_reviews (org_id, component_id);

CREATE INDEX IF NOT EXISTS group_reviews_org_status_idx
  ON public.group_reviews (org_id, status);

ALTER TABLE public.group_reviews ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_group_reviews_updated_at
  BEFORE UPDATE ON public.group_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "group_reviews_read" ON public.group_reviews
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "group_reviews_insert" ON public.group_reviews
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

-- Managers or the assigned reviewer may update
CREATE POLICY "group_reviews_update" ON public.group_reviews
  FOR UPDATE USING (
    public.has_min_role(org_id, 'MANAGER') OR reviewer_id = auth.uid()
  )
  WITH CHECK (
    public.has_min_role(org_id, 'MANAGER') OR reviewer_id = auth.uid()
  );

CREATE POLICY "group_reviews_delete" ON public.group_reviews
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

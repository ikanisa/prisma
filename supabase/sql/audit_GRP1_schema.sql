-- Group audit schema (GRP1) introducing component oversight, instructions,
-- workpaper ingestion, and review sign-offs with multi-tenant RLS.

-- Group audit components
CREATE TABLE IF NOT EXISTS public.group_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  component_code TEXT,
  component_name TEXT NOT NULL,
  component_type TEXT DEFAULT 'component',
  jurisdiction TEXT,
  lead_auditor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'planned',
  risk_level TEXT DEFAULT 'moderate',
  materiality_scope TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS group_components_org_code_idx
  ON public.group_components(org_id, component_code)
  WHERE component_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS group_components_org_eng_idx
  ON public.group_components(org_id, engagement_id);

ALTER TABLE public.group_components ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_group_components_updated_at
  BEFORE UPDATE ON public.group_components
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "group_components_read" ON public.group_components
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "group_components_insert" ON public.group_components
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "group_components_update" ON public.group_components
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "group_components_delete" ON public.group_components
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- Component instructions
CREATE TABLE IF NOT EXISTS public.group_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,
  instruction_title TEXT NOT NULL,
  instruction_body TEXT,
  status TEXT DEFAULT 'draft',
  due_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_instructions_org_component_idx
  ON public.group_instructions(org_id, component_id);

CREATE INDEX IF NOT EXISTS group_instructions_org_status_idx
  ON public.group_instructions(org_id, status);

ALTER TABLE public.group_instructions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_group_instructions_updated_at
  BEFORE UPDATE ON public.group_instructions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "group_instructions_read" ON public.group_instructions
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "group_instructions_insert" ON public.group_instructions
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "group_instructions_update_manager" ON public.group_instructions
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "group_instructions_ack" ON public.group_instructions
  FOR UPDATE USING (public.is_member_of(org_id))
  WITH CHECK (public.is_member_of(org_id) AND acknowledged_by = auth.uid());

-- Component workpapers
CREATE TABLE IF NOT EXISTS public.component_workpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,
  instruction_id UUID REFERENCES public.group_instructions(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'submitted',
  ingestion_method TEXT DEFAULT 'upload',
  ingested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ingested_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS component_workpapers_org_component_idx
  ON public.component_workpapers(org_id, component_id);

CREATE INDEX IF NOT EXISTS component_workpapers_org_status_idx
  ON public.component_workpapers(org_id, status);

ALTER TABLE public.component_workpapers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_component_workpapers_updated_at
  BEFORE UPDATE ON public.component_workpapers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "component_workpapers_read" ON public.component_workpapers
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "component_workpapers_insert" ON public.component_workpapers
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY "component_workpapers_update_manager" ON public.component_workpapers
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'))
  WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "component_workpapers_update_owner" ON public.component_workpapers
  FOR UPDATE USING (public.is_member_of(org_id) AND ingested_by = auth.uid())
  WITH CHECK (public.is_member_of(org_id) AND ingested_by = auth.uid());

CREATE POLICY "component_workpapers_delete" ON public.component_workpapers
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

-- Component reviews
CREATE TABLE IF NOT EXISTS public.component_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.group_components(id) ON DELETE CASCADE,
  workpaper_id UUID REFERENCES public.component_workpapers(id) ON DELETE SET NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  review_notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  due_at TIMESTAMPTZ,
  signed_off_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS component_reviews_org_component_idx
  ON public.component_reviews(org_id, component_id);

CREATE INDEX IF NOT EXISTS component_reviews_org_status_idx
  ON public.component_reviews(org_id, status);

ALTER TABLE public.component_reviews ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_component_reviews_updated_at
  BEFORE UPDATE ON public.component_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE POLICY "component_reviews_read" ON public.component_reviews
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "component_reviews_insert" ON public.component_reviews
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY "component_reviews_update" ON public.component_reviews
  FOR UPDATE USING (
    public.has_min_role(org_id, 'MANAGER') OR reviewer_id = auth.uid()
  )
  WITH CHECK (
    public.has_min_role(org_id, 'MANAGER') OR reviewer_id = auth.uid()
  );

CREATE POLICY "component_reviews_delete" ON public.component_reviews
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

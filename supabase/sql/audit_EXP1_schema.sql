-- Schema extensions for audit specialist evaluations and evidence (EXP1)
-- Covers expert use (ISA 620) and internal audit reliance (ISA 610)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'audit_specialist_status'
  ) THEN
    CREATE TYPE public.audit_specialist_status AS ENUM ('draft', 'in_review', 'final');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.audit_specialist_experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  specialist_name TEXT NOT NULL,
  specialist_firm TEXT,
  scope_of_work TEXT,
  competence_assessment TEXT,
  objectivity_assessment TEXT,
  work_performed TEXT,
  results_summary TEXT,
  conclusion TEXT,
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  concluded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  concluded_at TIMESTAMPTZ,
  status public.audit_specialist_status DEFAULT 'draft',
  standard_refs TEXT[] NOT NULL DEFAULT ARRAY['ISA 620'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, engagement_id)
);

CREATE TABLE IF NOT EXISTS public.audit_specialist_internal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  reliance_area TEXT NOT NULL,
  internal_audit_lead TEXT,
  scope_of_reliance TEXT,
  competence_evaluation TEXT,
  objectivity_evaluation TEXT,
  work_evaluation TEXT,
  risk_assessment TEXT,
  conclusion TEXT,
  prepared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  concluded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  concluded_at TIMESTAMPTZ,
  status public.audit_specialist_status DEFAULT 'draft',
  standard_refs TEXT[] NOT NULL DEFAULT ARRAY['ISA 610'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, engagement_id)
);

CREATE TABLE IF NOT EXISTS public.audit_specialist_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  expert_assessment_id UUID REFERENCES public.audit_specialist_experts(id) ON DELETE CASCADE,
  internal_assessment_id UUID REFERENCES public.audit_specialist_internal(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  evidence_url TEXT,
  description TEXT,
  notes TEXT,
  standard_refs TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT audit_specialist_evidence_context_chk CHECK (
    (expert_assessment_id IS NOT NULL AND internal_assessment_id IS NULL)
    OR (expert_assessment_id IS NULL AND internal_assessment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS audit_specialist_experts_org_eng_idx
  ON public.audit_specialist_experts (org_id, engagement_id);

CREATE INDEX IF NOT EXISTS audit_specialist_internal_org_eng_idx
  ON public.audit_specialist_internal (org_id, engagement_id);

CREATE INDEX IF NOT EXISTS audit_specialist_evidence_org_eng_idx
  ON public.audit_specialist_evidence (org_id, engagement_id);

ALTER TABLE public.audit_specialist_experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_specialist_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_specialist_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_specialist_experts_read ON public.audit_specialist_experts
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_specialist_experts_insert ON public.audit_specialist_experts
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_specialist_experts_update ON public.audit_specialist_experts
  FOR UPDATE USING (
    public.is_member_of(org_id) AND
    (prepared_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  )
  WITH CHECK (
    public.is_member_of(org_id) AND
    (prepared_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  );

CREATE POLICY audit_specialist_experts_delete ON public.audit_specialist_experts
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_specialist_internal_read ON public.audit_specialist_internal
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_specialist_internal_insert ON public.audit_specialist_internal
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_specialist_internal_update ON public.audit_specialist_internal
  FOR UPDATE USING (
    public.is_member_of(org_id) AND
    (prepared_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  )
  WITH CHECK (
    public.is_member_of(org_id) AND
    (prepared_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  );

CREATE POLICY audit_specialist_internal_delete ON public.audit_specialist_internal
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

CREATE POLICY audit_specialist_evidence_read ON public.audit_specialist_evidence
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY audit_specialist_evidence_insert ON public.audit_specialist_evidence
  FOR INSERT WITH CHECK (
    public.is_member_of(org_id) AND
    (uploaded_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  );

CREATE POLICY audit_specialist_evidence_update ON public.audit_specialist_evidence
  FOR UPDATE USING (
    public.is_member_of(org_id) AND
    (uploaded_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  )
  WITH CHECK (
    public.is_member_of(org_id) AND
    (uploaded_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  );

CREATE POLICY audit_specialist_evidence_delete ON public.audit_specialist_evidence
  FOR DELETE USING (
    public.is_member_of(org_id) AND
    (uploaded_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'))
  );

CREATE TRIGGER set_audit_specialist_experts_updated_at
  BEFORE UPDATE ON public.audit_specialist_experts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_audit_specialist_internal_updated_at
  BEFORE UPDATE ON public.audit_specialist_internal
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_audit_specialist_evidence_updated_at
  BEFORE UPDATE ON public.audit_specialist_evidence
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Shared audit schema baseline (Phase 0)
-- Defines common enums and base tables reused across audit modules for
-- consistent status, approvals, and metadata handling.

CREATE TYPE IF NOT EXISTS public.audit_module_code AS ENUM (
  'CTRL1',
  'ADA1',
  'REC1',
  'GRP1',
  'SOC1',
  'EXP1',
  'OI1',
  'KAM',
  'REPORT',
  'MISSTATEMENT',
  'OTHER'
);

CREATE TYPE IF NOT EXISTS public.audit_record_status AS ENUM (
  'NOT_STARTED',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'PENDING_APPROVAL',
  'APPROVED',
  'ARCHIVED'
);

CREATE TYPE IF NOT EXISTS public.audit_approval_state AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'RETURNED',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE IF NOT EXISTS public.audit_approval_stage AS ENUM (
  'PREPARER',
  'MANAGER',
  'PARTNER',
  'EQR'
);

CREATE TYPE IF NOT EXISTS public.audit_approval_decision AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETURNED'
);

CREATE TABLE IF NOT EXISTS public.audit_module_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  module_code public.audit_module_code NOT NULL,
  record_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  record_status public.audit_record_status NOT NULL DEFAULT 'NOT_STARTED',
  approval_state public.audit_approval_state NOT NULL DEFAULT 'DRAFT',
  current_stage public.audit_approval_stage NOT NULL DEFAULT 'PREPARER',
  prepared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  approvals JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, engagement_id, module_code, record_ref)
);

CREATE INDEX IF NOT EXISTS idx_audit_module_records_org_eng_module
  ON public.audit_module_records (org_id, engagement_id, module_code);
CREATE INDEX IF NOT EXISTS idx_audit_module_records_status
  ON public.audit_module_records (record_status, approval_state);

CREATE TRIGGER trg_audit_module_records_touch
  BEFORE UPDATE ON public.audit_module_records
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.audit_record_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.audit_module_records(id) ON DELETE CASCADE,
  stage public.audit_approval_stage NOT NULL,
  decision public.audit_approval_decision NOT NULL DEFAULT 'PENDING',
  decided_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (record_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_audit_record_approvals_record
  ON public.audit_record_approvals (record_id, stage);
CREATE INDEX IF NOT EXISTS idx_audit_record_approvals_decision
  ON public.audit_record_approvals (decision, stage);

CREATE TRIGGER trg_audit_record_approvals_touch
  BEFORE UPDATE ON public.audit_record_approvals
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- RLS policies for shared audit module tables

ALTER TABLE public.audit_module_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_module_records_select" ON public.audit_module_records;
CREATE POLICY "audit_module_records_select" ON public.audit_module_records
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "audit_module_records_insert" ON public.audit_module_records;
CREATE POLICY "audit_module_records_insert" ON public.audit_module_records
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "audit_module_records_update" ON public.audit_module_records;
CREATE POLICY "audit_module_records_update" ON public.audit_module_records
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "audit_module_records_delete" ON public.audit_module_records;
CREATE POLICY "audit_module_records_delete" ON public.audit_module_records
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.audit_record_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_record_approvals_select" ON public.audit_record_approvals;
CREATE POLICY "audit_record_approvals_select" ON public.audit_record_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.audit_module_records r
      WHERE r.id = audit_record_approvals.record_id
        AND public.is_member_of(r.org_id)
    )
  );
DROP POLICY IF EXISTS "audit_record_approvals_insert" ON public.audit_record_approvals;
CREATE POLICY "audit_record_approvals_insert" ON public.audit_record_approvals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.audit_module_records r
      WHERE r.id = audit_record_approvals.record_id
        AND public.has_min_role(r.org_id, 'MANAGER')
    )
  );
DROP POLICY IF EXISTS "audit_record_approvals_update" ON public.audit_record_approvals;
CREATE POLICY "audit_record_approvals_update" ON public.audit_record_approvals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.audit_module_records r
      WHERE r.id = audit_record_approvals.record_id
        AND public.has_min_role(r.org_id, 'MANAGER')
    )
  );
DROP POLICY IF EXISTS "audit_record_approvals_delete" ON public.audit_record_approvals;
CREATE POLICY "audit_record_approvals_delete" ON public.audit_record_approvals
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.audit_module_records r
      WHERE r.id = audit_record_approvals.record_id
        AND public.has_min_role(r.org_id, 'SYSTEM_ADMIN')
    )
  );

-- RLS policies for Deterministic Analytics Kernel tables (ADA-1)

ALTER TABLE public.ada_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ada_runs_select" ON public.ada_runs;
CREATE POLICY "ada_runs_select" ON public.ada_runs
  FOR SELECT USING (public.is_member_of(org_id));
DROP POLICY IF EXISTS "ada_runs_insert" ON public.ada_runs;
CREATE POLICY "ada_runs_insert" ON public.ada_runs
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "ada_runs_update" ON public.ada_runs;
CREATE POLICY "ada_runs_update" ON public.ada_runs
  FOR UPDATE USING (public.has_min_role(org_id, 'EMPLOYEE'));
DROP POLICY IF EXISTS "ada_runs_delete" ON public.ada_runs;
CREATE POLICY "ada_runs_delete" ON public.ada_runs
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'));

ALTER TABLE public.ada_exceptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ada_exceptions_select" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_select" ON public.ada_exceptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.is_member_of(r.org_id)
    )
  );
DROP POLICY IF EXISTS "ada_exceptions_insert" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_insert" ON public.ada_exceptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.has_min_role(r.org_id, 'EMPLOYEE')
    )
  );
DROP POLICY IF EXISTS "ada_exceptions_update" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_update" ON public.ada_exceptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.has_min_role(r.org_id, 'EMPLOYEE')
    )
  );
DROP POLICY IF EXISTS "ada_exceptions_delete" ON public.ada_exceptions;
CREATE POLICY "ada_exceptions_delete" ON public.ada_exceptions
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.ada_runs r
      WHERE r.id = ada_exceptions.run_id
        AND public.has_min_role(r.org_id, 'MANAGER')
    )
  );

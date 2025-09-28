-- RLS rules for DAC6 tables

ALTER TABLE public.dac6_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dac6_hallmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dac6_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dac6_filings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dac6_arrangements_rw ON public.dac6_arrangements;
CREATE POLICY dac6_arrangements_rw ON public.dac6_arrangements
  FOR ALL
  USING (app.is_member_of(org_id, 'staff'))
  WITH CHECK (app.is_member_of(org_id, 'staff'));

DROP POLICY IF EXISTS dac6_hallmarks_rw ON public.dac6_hallmarks;
CREATE POLICY dac6_hallmarks_rw ON public.dac6_hallmarks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dac6_arrangements a
      WHERE a.id = dac6_hallmarks.arrangement_id
        AND app.is_member_of(a.org_id, 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dac6_arrangements a
      WHERE a.id = dac6_hallmarks.arrangement_id
        AND app.is_member_of(a.org_id, 'staff')
    )
  );

DROP POLICY IF EXISTS dac6_participants_rw ON public.dac6_participants;
CREATE POLICY dac6_participants_rw ON public.dac6_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dac6_arrangements a
      WHERE a.id = dac6_participants.arrangement_id
        AND app.is_member_of(a.org_id, 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dac6_arrangements a
      WHERE a.id = dac6_participants.arrangement_id
        AND app.is_member_of(a.org_id, 'staff')
    )
  );

DROP POLICY IF EXISTS dac6_filings_rw ON public.dac6_filings;
CREATE POLICY dac6_filings_rw ON public.dac6_filings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.dac6_arrangements a
      WHERE a.id = dac6_filings.arrangement_id
        AND app.is_member_of(a.org_id, 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dac6_arrangements a
      WHERE a.id = dac6_filings.arrangement_id
        AND app.is_member_of(a.org_id, 'staff')
    )
  );

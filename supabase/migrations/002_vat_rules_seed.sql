DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'tax'
  ) THEN
    INSERT INTO public.tax (org_id, jurisdiction, rule, rate, reverse_charge)
    VALUES
      (NULL, 'MT', 'standard', 0.18, false),
      (NULL, 'EU', 'b2b_reverse_charge', 0.00, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

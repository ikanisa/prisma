-- Seed default VAT rules
INSERT INTO public.tax (org_id, jurisdiction, rule, rate, reverse_charge)
VALUES
  (NULL, 'MT', 'standard', 0.18, false),
  (NULL, 'EU', 'b2b_reverse_charge', 0.00, true)
ON CONFLICT DO NOTHING;

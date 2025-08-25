-- Seed data for VAT rules
INSERT INTO public.vat_rules (country_code, rate, description)
VALUES
  ('DE', 19.00, 'Germany standard VAT rate'),
  ('FR', 20.00, 'France standard VAT rate'),
  ('GB', 20.00, 'United Kingdom standard VAT rate'),
  ('ES', 21.00, 'Spain standard VAT rate'),
  ('NL', 21.00, 'Netherlands standard VAT rate');

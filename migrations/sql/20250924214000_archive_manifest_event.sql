-- Activity catalog entry for archive manifest updates
BEGIN;

INSERT INTO public.activity_event_catalog (action, description, module, policy_pack, standard_refs, severity)
VALUES
  ('ARCHIVE_MANIFEST_UPDATED', 'Engagement archive manifest regenerated with latest module statuses.', 'ARCHIVE', 'AP-GOV-1', ARRAY['ISA 230','ISQM 1'], 'INFO')
ON CONFLICT (action) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  policy_pack = EXCLUDED.policy_pack,
  standard_refs = EXCLUDED.standard_refs,
  severity = EXCLUDED.severity;

COMMIT;

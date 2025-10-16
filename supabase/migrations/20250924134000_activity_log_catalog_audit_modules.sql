-- ActivityLog catalog entries for audit fieldwork modules
BEGIN;

INSERT INTO public.activity_event_catalog (action, description, module, policy_pack, standard_refs, severity) VALUES
  ('SOC_CREATED', 'Service organisation recorded for SOC oversight.', 'AUDIT_SOC1', 'AP-GOV-1', ARRAY['ISA 402'], 'INFO'),
  ('SOC_REPORT_ADDED', 'SOC report metadata captured for service organisation.', 'AUDIT_SOC1', 'AP-GOV-1', ARRAY['ISA 402'], 'INFO'),
  ('SOC_CUEC_TESTED', 'Complementary user control evaluated.', 'AUDIT_SOC1', 'AP-GOV-1', ARRAY['ISA 402'], 'INFO'),
  ('SOC_EXCEPTION_ESCALATED', 'SOC exception escalated for manager review.', 'AUDIT_SOC1', 'AP-GOV-1', ARRAY['ISA 402'], 'WARNING'),
  ('GRP_COMPONENT_CREATED', 'Group component added to engagement oversight register.', 'AUDIT_GRP1', 'AP-GOV-1', ARRAY['ISA 600'], 'INFO'),
  ('GRP_INSTRUCTION_SENT', 'Instruction issued to component auditor.', 'AUDIT_GRP1', 'AP-GOV-1', ARRAY['ISA 600'], 'NOTICE'),
  ('GRP_INSTRUCTION_ACKED', 'Component auditor acknowledged instruction.', 'AUDIT_GRP1', 'AP-GOV-1', ARRAY['ISA 600'], 'INFO'),
  ('GRP_INSTRUCTION_COMPLETED', 'Component instruction completed and ready for review.', 'AUDIT_GRP1', 'AP-GOV-1', ARRAY['ISA 600'], 'NOTICE'),
  ('GRP_WORKPAPER_RECEIVED', 'Workpaper received from component auditor.', 'AUDIT_GRP1', 'AP-GOV-1', ARRAY['ISA 600'], 'INFO'),
  ('GRP_REVIEW_UPDATED', 'Group review status updated.', 'AUDIT_GRP1', 'AP-GOV-1', ARRAY['ISA 600'], 'INFO'),
  ('ENGAGEMENT_INDEPENDENCE_UPDATED', 'Independence assessment updated with override/safeguard detail.', 'AUDIT_GOV', 'AP-GOV-1', ARRAY['ISA 220','IESBA 600'], 'NOTICE'),
  ('EXP_EXPERT_ASSESSED', 'External specialist reliance assessment captured.', 'AUDIT_EXP1', 'AP-GOV-1', ARRAY['ISA 620'], 'INFO'),
  ('EXP_IA_ASSESSED', 'Internal audit reliance assessment captured.', 'AUDIT_EXP1', 'AP-GOV-1', ARRAY['ISA 610'], 'INFO'),
  ('OI_UPLOADED', 'Other information document uploaded for review.', 'AUDIT_OI1', 'AP-GOV-1', ARRAY['ISA 720'], 'INFO'),
  ('OI_FLAGGED', 'Other information inconsistency flagged.', 'AUDIT_OI1', 'AP-GOV-1', ARRAY['ISA 720'], 'NOTICE'),
  ('OI_RESOLVED', 'Other information flag resolved.', 'AUDIT_OI1', 'AP-GOV-1', ARRAY['ISA 720'], 'INFO')
ON CONFLICT (action) DO UPDATE SET
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  policy_pack = EXCLUDED.policy_pack,
  standard_refs = EXCLUDED.standard_refs,
  severity = EXCLUDED.severity;

COMMIT;

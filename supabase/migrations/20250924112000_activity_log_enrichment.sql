-- ActivityLog enrichment and event catalog (GOV-CORE)
BEGIN;

ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS module TEXT,
  ADD COLUMN IF NOT EXISTS policy_pack TEXT,
  ADD COLUMN IF NOT EXISTS standard_refs TEXT[] DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.activity_event_catalog (
  action TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  module TEXT NOT NULL,
  policy_pack TEXT,
  standard_refs TEXT[] DEFAULT '{}'::text[],
  severity TEXT DEFAULT 'INFO'
);

INSERT INTO public.activity_event_catalog (action, description, module, policy_pack, standard_refs, severity) VALUES
  ('PLAN_CREATED', 'Initial audit plan record created with basis framework.', 'AUDIT_PLAN', 'AP-GOV-1', ARRAY['ISA 300','ISA 220R'], 'INFO'),
  ('PLAN_STRATEGY_UPDATED', 'Audit strategy updated prior to lock.', 'AUDIT_PLAN', 'AP-GOV-1', ARRAY['ISA 300'], 'INFO'),
  ('MATERIALITY_SET', 'Financial statement materiality captured.', 'AUDIT_PLAN', 'AP-GOV-1', ARRAY['ISA 320'], 'INFO'),
  ('PLAN_SUBMITTED', 'Audit plan submitted for partner approval.', 'AUDIT_PLAN', 'AP-GOV-1', ARRAY['ISA 220R'], 'NOTICE'),
  ('PLAN_APPROVED', 'Partner approval recorded for audit plan.', 'AUDIT_PLAN', 'AP-GOV-1', ARRAY['ISA 220R'], 'NOTICE'),
  ('PLAN_LOCKED', 'Audit plan locked after approval.', 'AUDIT_PLAN', 'AP-GOV-1', ARRAY['ISA 230'], 'NOTICE'),
  ('PLAN_APPROVAL_REJECTED', 'Partner rejected audit plan submission.', 'AUDIT_PLAN', 'AP-GOV-1', ARRAY['ISA 220R'], 'WARNING'),
  ('RISK_CREATED', 'Risk of material misstatement captured in register.', 'AUDIT_RISK', 'AP-GOV-1', ARRAY['ISA 315R'], 'INFO'),
  ('RISK_UPDATED', 'Risk register entry updated.', 'AUDIT_RISK', 'AP-GOV-1', ARRAY['ISA 315R'], 'INFO'),
  ('RISK_STATUS_CHANGED', 'Risk status or residual rating changed.', 'AUDIT_RISK', 'AP-GOV-1', ARRAY['ISA 315R'], 'NOTICE'),
  ('RISK_SIGNAL_RECORDED', 'Analytics signal recorded against risk.', 'AUDIT_RISK', 'AP-GOV-1', ARRAY['ISA 315R'], 'INFO'),
  ('RISK_ACTIVITY_RECORDED', 'Activity added to risk history.', 'AUDIT_RISK', 'AP-GOV-1', ARRAY['ISA 315R'], 'INFO'),
  ('RESPONSE_CREATED', 'Planned response linked to risk.', 'AUDIT_RESPONSE', 'AP-GOV-1', ARRAY['ISA 330'], 'INFO'),
  ('RESPONSE_UPDATED', 'Planned response updated.', 'AUDIT_RESPONSE', 'AP-GOV-1', ARRAY['ISA 330'], 'INFO'),
  ('RESPONSE_STATUS_CHANGED', 'Response status transitioned.', 'AUDIT_RESPONSE', 'AP-GOV-1', ARRAY['ISA 330'], 'NOTICE'),
  ('RESPONSE_CHECK_RECORDED', 'Completeness check performed on response.', 'AUDIT_RESPONSE', 'AP-GOV-1', ARRAY['ISA 330'], 'NOTICE'),
  ('FRAUD_PLAN_CREATED', 'Fraud plan initiated.', 'FRAUD_PLAN', 'AP-GOV-1', ARRAY['ISA 240'], 'INFO'),
  ('FRAUD_PLAN_UPDATED', 'Fraud plan updated.', 'FRAUD_PLAN', 'AP-GOV-1', ARRAY['ISA 240'], 'INFO'),
  ('FRAUD_PLAN_SUBMITTED', 'Fraud plan submitted for partner approval.', 'FRAUD_PLAN', 'AP-GOV-1', ARRAY['ISA 240'], 'NOTICE'),
  ('FRAUD_PLAN_APPROVED', 'Fraud plan approved and locked.', 'FRAUD_PLAN', 'AP-GOV-1', ARRAY['ISA 240'], 'NOTICE'),
  ('FRAUD_PLAN_REJECTED', 'Fraud plan rejected and returned to draft.', 'FRAUD_PLAN', 'AP-GOV-1', ARRAY['ISA 240'], 'WARNING'),
  ('FRAUD_PLAN_ACTION_RECORDED', 'Action logged against fraud plan.', 'FRAUD_PLAN', 'AP-GOV-1', ARRAY['ISA 240'], 'INFO'),
  ('JE_STRATEGY_UPDATED', 'Journal entry strategy updated.', 'FRAUD_PLAN', 'AP-GOV-1', ARRAY['ISA 240'], 'INFO'),
  ('MT_CIT_COMPUTED', 'Malta CIT computation prepared.', 'TAX_MALTA_CIT', 'T-GOV-1', ARRAY['Malta ITA Cap.123'], 'INFO'),
  ('MT_CIT_RETURN_READY', 'Malta corporate tax return schedules generated.', 'TAX_MALTA_CIT', 'T-GOV-1', ARRAY['Malta ITA Cap.123'], 'INFO'),
  ('MT_CIT_APPROVAL_SUBMITTED', 'Malta CIT computation submitted for approval.', 'TAX_MALTA_CIT', 'T-GOV-1', ARRAY['Malta ITA Cap.123'], 'NOTICE'),
  ('MT_CIT_APPROVED', 'Partner approved Malta CIT computation.', 'TAX_MALTA_CIT', 'T-GOV-1', ARRAY['Malta ITA Cap.123'], 'NOTICE'),
  ('MT_CIT_APPROVAL_REJECTED', 'Malta CIT computation rejected.', 'TAX_MALTA_CIT', 'T-GOV-1', ARRAY['Malta ITA Cap.123'], 'WARNING'),
  ('GL_ACCOUNTS_IMPORTED', 'Chart of accounts imported into close workspace.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 1'], 'INFO'),
  ('GL_ENTRIES_IMPORTED', 'Journal entries imported for close period.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 1'], 'INFO'),
  ('JE_BATCH_CREATED', 'Journal batch created.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 8'], 'INFO'),
  ('JE_LINES_ADDED', 'Lines added to journal batch.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 8'], 'INFO'),
  ('JE_SUBMITTED', 'Journal batch submitted for approval.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 8'], 'NOTICE'),
  ('JE_APPROVED', 'Journal batch approved.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 8'], 'NOTICE'),
  ('JE_POSTED', 'Journal batch posted.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 8'], 'NOTICE'),
  ('RECON_CREATED', 'Reconciliation created.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 7'], 'INFO'),
  ('RECON_ITEM_ADDED', 'Item added to reconciliation.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 7'], 'INFO'),
  ('RECON_CLOSED', 'Reconciliation closed.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 7'], 'NOTICE'),
  ('TB_SNAPSHOTTED', 'Trial balance snapshot captured.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 1'], 'INFO'),
  ('VARIANCE_RUN', 'Variance analysis executed.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 1'], 'INFO'),
  ('PBC_INSTANTIATED', 'PBC request list instantiated.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['ISQM 1'], 'INFO'),
  ('CLOSE_ADVANCED', 'Close period moved to next milestone.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['ISQM 1'], 'INFO'),
  ('CLOSE_LOCKED', 'Close period locked after approvals.', 'ACCOUNTING_CLOSE', 'A-GOV-1', ARRAY['IAS 10'], 'NOTICE')
ON CONFLICT (action) DO UPDATE SET
  module = EXCLUDED.module,
  policy_pack = EXCLUDED.policy_pack,
  standard_refs = EXCLUDED.standard_refs,
  description = EXCLUDED.description,
  severity = EXCLUDED.severity;

CREATE OR REPLACE FUNCTION app.activity_log_enrich()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = app, public
AS $$
DECLARE
  catalog public.activity_event_catalog%ROWTYPE;
BEGIN
  SELECT * INTO catalog
  FROM public.activity_event_catalog
  WHERE action = NEW.action;

  IF FOUND THEN
    NEW.module := COALESCE(NEW.module, catalog.module);
    NEW.policy_pack := COALESCE(NEW.policy_pack, catalog.policy_pack);
    IF NEW.standard_refs IS NULL OR array_length(NEW.standard_refs, 1) = 0 THEN
      NEW.standard_refs := catalog.standard_refs;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_log_enrich ON public.activity_log;
CREATE TRIGGER trg_activity_log_enrich
  BEFORE INSERT ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION app.activity_log_enrich();

COMMIT;

-- =============================================================================
-- AI Engine Database Schema Migration
-- =============================================================================
-- Description: Add tables for AI model training, transaction processing,
--              anomaly detection, and continuous learning features.
-- Target: Prisma AI Enhancement Phase 1
-- =============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- AI Model Training & Performance Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_model_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL CHECK (model_type IN ('precision', 'predictive', 'anomaly', 'ensemble')),
  training_data_version TEXT NOT NULL,
  accuracy_score DECIMAL(5,4) CHECK (accuracy_score >= 0 AND accuracy_score <= 1),
  precision_score DECIMAL(5,4) CHECK (precision_score >= 0 AND precision_score <= 1),
  recall_score DECIMAL(5,4) CHECK (recall_score >= 0 AND recall_score <= 1),
  f1_score DECIMAL(5,4) CHECK (f1_score >= 0 AND f1_score <= 1),
  confidence_distribution JSONB,
  training_samples INTEGER NOT NULL DEFAULT 0,
  evaluation_samples INTEGER NOT NULL DEFAULT 0,
  hyperparameters JSONB,
  trained_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_model_training
CREATE INDEX IF NOT EXISTS idx_ai_model_training_type ON public.ai_model_training(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_training_org ON public.ai_model_training(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_training_trained_at ON public.ai_model_training(trained_at DESC);

-- RLS for ai_model_training
ALTER TABLE public.ai_model_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS ai_model_training_org_read ON public.ai_model_training
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS ai_model_training_org_write ON public.ai_model_training
  FOR ALL USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

-- =============================================================================
-- Transaction Processing Results
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.transaction_processing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('bank_feed', 'invoice', 'receipt', 'journal_entry', 'payment', 'transfer', 'adjustment')),
  model_used TEXT NOT NULL CHECK (model_used IN ('precision', 'predictive', 'anomaly', 'ensemble')),
  confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  predicted_category TEXT NOT NULL,
  suggested_account TEXT,
  account_confidence DECIMAL(5,4) CHECK (account_confidence >= 0 AND account_confidence <= 1),
  route TEXT NOT NULL CHECK (route IN ('auto', 'human-review', 'reject')),
  auto_processed BOOLEAN DEFAULT FALSE,
  human_reviewed BOOLEAN DEFAULT FALSE,
  correction_applied BOOLEAN DEFAULT FALSE,
  processing_time_ms INTEGER,
  reasoning TEXT,
  predictions JSONB, -- Array of {model, category, confidence}
  anomaly_flags JSONB, -- Array of detected anomalies
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  processed_by UUID,
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transaction_processing
CREATE INDEX IF NOT EXISTS idx_tx_processing_transaction ON public.transaction_processing(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tx_processing_org ON public.transaction_processing(org_id);
CREATE INDEX IF NOT EXISTS idx_tx_processing_route ON public.transaction_processing(route);
CREATE INDEX IF NOT EXISTS idx_tx_processing_category ON public.transaction_processing(predicted_category);
CREATE INDEX IF NOT EXISTS idx_tx_processing_created ON public.transaction_processing(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_processing_pending_review ON public.transaction_processing(org_id, route) WHERE route = 'human-review' AND human_reviewed = FALSE;

-- RLS for transaction_processing
ALTER TABLE public.transaction_processing ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tx_processing_org_read ON public.transaction_processing
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS tx_processing_org_write ON public.transaction_processing
  FOR ALL USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

-- =============================================================================
-- User Corrections for Learning
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL,
  processing_id UUID REFERENCES public.transaction_processing(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('category', 'amount', 'vendor', 'account', 'date', 'other')),
  original_value TEXT,
  corrected_value TEXT NOT NULL,
  original_confidence DECIMAL(5,4),
  notes TEXT,
  applied_to_model BOOLEAN DEFAULT FALSE,
  model_version TEXT,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_corrections
CREATE INDEX IF NOT EXISTS idx_ai_corrections_org ON public.ai_corrections(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_corrections_type ON public.ai_corrections(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ai_corrections_created ON public.ai_corrections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_corrections_not_applied ON public.ai_corrections(org_id) WHERE applied_to_model = FALSE;
CREATE INDEX IF NOT EXISTS idx_ai_corrections_transaction ON public.ai_corrections(transaction_id);

-- RLS for ai_corrections
ALTER TABLE public.ai_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS ai_corrections_org_read ON public.ai_corrections
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS ai_corrections_org_write ON public.ai_corrections
  FOR ALL USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

-- =============================================================================
-- Anomaly Detections
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.anomaly_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID,
  processing_id UUID REFERENCES public.transaction_processing(id) ON DELETE SET NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('point', 'contextual', 'collective')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
  description TEXT NOT NULL,
  reason TEXT,
  recommended_action TEXT,
  related_transactions JSONB, -- Array of related transaction IDs
  reviewed BOOLEAN DEFAULT FALSE,
  false_positive BOOLEAN DEFAULT FALSE,
  reviewer_notes TEXT,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for anomaly_detections
CREATE INDEX IF NOT EXISTS idx_anomaly_org ON public.anomaly_detections(org_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_type ON public.anomaly_detections(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_severity ON public.anomaly_detections(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_transaction ON public.anomaly_detections(transaction_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_created ON public.anomaly_detections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_pending ON public.anomaly_detections(org_id, severity) WHERE reviewed = FALSE;
CREATE INDEX IF NOT EXISTS idx_anomaly_high_priority ON public.anomaly_detections(org_id) WHERE severity IN ('high', 'critical') AND reviewed = FALSE;

-- RLS for anomaly_detections
ALTER TABLE public.anomaly_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS anomaly_org_read ON public.anomaly_detections
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS anomaly_org_write ON public.anomaly_detections
  FOR ALL USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

-- =============================================================================
-- Entity Risk Scores
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- Can reference client, vendor, or engagement
  entity_type TEXT NOT NULL CHECK (entity_type IN ('client', 'vendor', 'engagement', 'account')),
  period_start DATE,
  period_end DATE,
  overall_risk_score DECIMAL(5,2) CHECK (overall_risk_score >= 0 AND overall_risk_score <= 100),
  transaction_count INTEGER DEFAULT 0,
  anomaly_count INTEGER DEFAULT 0,
  point_anomaly_count INTEGER DEFAULT 0,
  contextual_anomaly_count INTEGER DEFAULT 0,
  collective_anomaly_count INTEGER DEFAULT 0,
  fraud_indicators INTEGER DEFAULT 0,
  control_override_count INTEGER DEFAULT 0,
  duplicate_payment_count INTEGER DEFAULT 0,
  risk_factors JSONB, -- Breakdown of contributing factors
  trend TEXT CHECK (trend IN ('improving', 'stable', 'worsening')),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for risk_scores
CREATE INDEX IF NOT EXISTS idx_risk_entity ON public.risk_scores(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_risk_org ON public.risk_scores(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_score ON public.risk_scores(overall_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_period ON public.risk_scores(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_risk_calculated ON public.risk_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_high_score ON public.risk_scores(org_id) WHERE overall_risk_score >= 75;

-- RLS for risk_scores
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS risk_org_read ON public.risk_scores
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS risk_org_write ON public.risk_scores
  FOR ALL USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

-- =============================================================================
-- Vendor Patterns for Learning
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vendor_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_normalized TEXT NOT NULL,
  vendor_display_name TEXT,
  typical_category TEXT,
  typical_categories JSONB, -- Array of {category, count, percentage}
  typical_amount_mean DECIMAL(15,2),
  typical_amount_stddev DECIMAL(15,2),
  typical_amount_min DECIMAL(15,2),
  typical_amount_max DECIMAL(15,2),
  transaction_count INTEGER DEFAULT 0,
  confidence DECIMAL(5,4) DEFAULT 0.5,
  last_transaction_at TIMESTAMPTZ,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, vendor_normalized)
);

-- Indexes for vendor_patterns
CREATE INDEX IF NOT EXISTS idx_vendor_patterns_org ON public.vendor_patterns(org_id);
CREATE INDEX IF NOT EXISTS idx_vendor_patterns_normalized ON public.vendor_patterns(vendor_normalized);
CREATE INDEX IF NOT EXISTS idx_vendor_patterns_category ON public.vendor_patterns(typical_category);
CREATE INDEX IF NOT EXISTS idx_vendor_patterns_count ON public.vendor_patterns(transaction_count DESC);

-- RLS for vendor_patterns
ALTER TABLE public.vendor_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS vendor_patterns_org_read ON public.vendor_patterns
  FOR SELECT USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

CREATE POLICY IF NOT EXISTS vendor_patterns_org_write ON public.vendor_patterns
  FOR ALL USING (org_id IN (SELECT org_id FROM public.memberships WHERE user_id = auth.uid()));

-- =============================================================================
-- AI Processing Metrics (Materialized View for Dashboard)
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.ai_processing_metrics AS
SELECT
  org_id,
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS total_processed,
  COUNT(*) FILTER (WHERE route = 'auto') AS auto_processed,
  COUNT(*) FILTER (WHERE route = 'human-review') AS human_reviewed,
  COUNT(*) FILTER (WHERE route = 'reject') AS rejected,
  AVG(confidence_score) AS avg_confidence,
  AVG(processing_time_ms) AS avg_processing_time_ms,
  COUNT(*) FILTER (WHERE correction_applied = TRUE) AS corrections_count,
  -- Accuracy estimation: (auto + approved reviews) / total
  CASE 
    WHEN COUNT(*) > 0 THEN
      (COUNT(*) FILTER (WHERE route = 'auto') + 
       COUNT(*) FILTER (WHERE route = 'human-review' AND correction_applied = FALSE))::DECIMAL / COUNT(*)
    ELSE 0
  END AS estimated_accuracy
FROM public.transaction_processing
GROUP BY org_id, DATE_TRUNC('day', created_at);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_ai_processing_metrics()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.ai_processing_metrics;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- No automatic trigger (refresh on schedule or demand)
-- COMMENT: Use pg_cron or application scheduler to refresh periodically

-- =============================================================================
-- Helpful Functions
-- =============================================================================

-- Get pending review count for an org
CREATE OR REPLACE FUNCTION get_pending_review_count(p_org_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.transaction_processing
    WHERE org_id = p_org_id
      AND route = 'human-review'
      AND human_reviewed = FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get AI performance summary for an org
CREATE OR REPLACE FUNCTION get_ai_performance_summary(p_org_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_processed BIGINT,
  auto_process_rate DECIMAL,
  avg_confidence DECIMAL,
  correction_rate DECIMAL,
  estimated_accuracy DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_processed,
    COALESCE(
      COUNT(*) FILTER (WHERE route = 'auto')::DECIMAL / NULLIF(COUNT(*), 0),
      0
    ) AS auto_process_rate,
    COALESCE(AVG(confidence_score), 0) AS avg_confidence,
    COALESCE(
      COUNT(*) FILTER (WHERE correction_applied = TRUE)::DECIMAL / NULLIF(COUNT(*), 0),
      0
    ) AS correction_rate,
    COALESCE(
      (COUNT(*) FILTER (WHERE route = 'auto') + 
       COUNT(*) FILTER (WHERE route = 'human-review' AND correction_applied = FALSE))::DECIMAL / 
       NULLIF(COUNT(*), 0),
      0
    ) AS estimated_accuracy
  FROM public.transaction_processing
  WHERE org_id = p_org_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- Comments for Documentation
-- =============================================================================

COMMENT ON TABLE public.ai_model_training IS 'Tracks AI model training runs, performance metrics, and versions';
COMMENT ON TABLE public.transaction_processing IS 'Stores AI processing results for each transaction including confidence and routing';
COMMENT ON TABLE public.ai_corrections IS 'User corrections for continuous model learning';
COMMENT ON TABLE public.anomaly_detections IS 'Detected anomalies (point, contextual, collective) for transactions';
COMMENT ON TABLE public.risk_scores IS 'Risk assessments for entities based on anomaly patterns';
COMMENT ON TABLE public.vendor_patterns IS 'Learned vendor patterns for precision model matching';

COMMENT ON FUNCTION get_pending_review_count IS 'Returns count of transactions pending human review for an organization';
COMMENT ON FUNCTION get_ai_performance_summary IS 'Returns AI performance metrics summary for the last N days';

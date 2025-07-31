-- Complete Self-Learning Omni-Agent Database Schema
-- Missing core tables for the full architecture

-- Create conversation_state table for active sessions
CREATE TABLE IF NOT EXISTS public.conversation_state (
  user_id text PRIMARY KEY,
  current_stage text DEFAULT 'initial',
  last_intent text,
  confidence real DEFAULT 0.0,
  context_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create quality_feedback table for continuous learning
CREATE TABLE IF NOT EXISTS public.quality_feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  original_response text NOT NULL,
  patched_response text,
  patch_reason text,
  quality_score real DEFAULT 0.0,
  model_used text DEFAULT 'gpt-4o',
  created_at timestamp with time zone DEFAULT now()
);

-- Create live_handoffs table for human-in-the-loop
CREATE TABLE IF NOT EXISTS public.live_handoffs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'resolved')),
  operator_id text,
  context_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone
);

-- Create system_metrics table for KPI tracking
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  measurement_period text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Create outgoing_log table for message idempotency
CREATE TABLE IF NOT EXISTS public.outgoing_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tx_hash text UNIQUE NOT NULL,
  wa_id text NOT NULL,
  message_payload jsonb NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  delivery_status text DEFAULT 'sent'
);

-- Enable RLS on all new tables
ALTER TABLE public.conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system access
CREATE POLICY "System can manage conversation_state" 
ON public.conversation_state FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage quality_feedback" 
ON public.quality_feedback FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage live_handoffs" 
ON public.live_handoffs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage system_metrics" 
ON public.system_metrics FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage outgoing_log" 
ON public.outgoing_log FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_state_stage 
ON public.conversation_state(current_stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_feedback_score 
ON public.quality_feedback(quality_score, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_handoffs_status 
ON public.live_handoffs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_period 
ON public.system_metrics(metric_name, measurement_period, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outgoing_log_tx_hash 
ON public.outgoing_log(tx_hash);

-- Create trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversation_state_updated_at
    BEFORE UPDATE ON public.conversation_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media-uploads', 'media-uploads', false) ON CONFLICT DO NOTHING;

-- Create storage policies
CREATE POLICY "Public can view QR codes" 
ON storage.objects FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "System can upload QR codes" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-codes');

CREATE POLICY "System can manage media uploads" 
ON storage.objects FOR ALL USING (bucket_id = 'media-uploads') WITH CHECK (bucket_id = 'media-uploads');
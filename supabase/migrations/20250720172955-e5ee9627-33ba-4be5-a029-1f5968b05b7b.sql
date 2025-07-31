
-- Phase 1: Missing Core Tables and Database Foundation
-- Adding critical missing tables for WhatsApp contacts and improving existing structure

-- Create wa_contacts table for WhatsApp contact management
CREATE TABLE IF NOT EXISTS public.wa_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_id TEXT NOT NULL UNIQUE, -- WhatsApp phone number ID
  display_name TEXT,
  business_name TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tags TEXT[] DEFAULT '{}',
  profile_pic_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on wa_contacts
ALTER TABLE public.wa_contacts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wa_contacts
CREATE POLICY "Admin can manage wa_contacts" ON public.wa_contacts
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "System can manage wa_contacts" ON public.wa_contacts
  FOR ALL USING (true) WITH CHECK (true);

-- Create partial index for soft delete
CREATE INDEX IF NOT EXISTS idx_wa_contacts_active ON public.wa_contacts(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wa_contacts_wa_id ON public.wa_contacts(wa_id) WHERE deleted_at IS NULL;

-- Add missing indexes to existing tables
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversation_messages_phone ON public.conversation_messages(phone_number) WHERE phone_number IS NOT NULL;

-- Create sync_runs table for tracking data synchronization
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'google_places', 'scraper', 'contact_import'
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  rows_added INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  error_log TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on sync_runs
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_runs
CREATE POLICY "Admin can manage sync_runs" ON public.sync_runs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add soft delete columns to tables that need them
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create partial indexes for soft deletes
CREATE INDEX IF NOT EXISTS idx_contacts_active ON public.contacts(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_active ON public.orders(id) WHERE deleted_at IS NULL;

-- Create feature_flags table for experiments
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_audience JSONB DEFAULT '{}', -- JSON criteria for targeting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for feature_flags
CREATE POLICY "Admin can manage feature_flags" ON public.feature_flags
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users can read active feature_flags" ON public.feature_flags
  FOR SELECT USING (is_enabled = true);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to tables that need them
DROP TRIGGER IF EXISTS update_wa_contacts_updated_at ON public.wa_contacts;
CREATE TRIGGER update_wa_contacts_updated_at
  BEFORE UPDATE ON public.wa_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for system metrics (performance optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.system_metrics_summary AS
SELECT 
  'conversations' as metric_type,
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'ended') as ended_count,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') as last_24h_count
FROM public.conversations
UNION ALL
SELECT 
  'contacts' as metric_type,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
  COUNT(*) FILTER (WHERE opted_out = true) as ended_count,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') as last_24h_count
FROM public.contacts
UNION ALL
SELECT 
  'orders' as metric_type,
  COUNT(*) FILTER (WHERE status = 'pending') as active_count,
  COUNT(*) FILTER (WHERE status IN ('completed', 'cancelled')) as ended_count,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') as last_24h_count
FROM public.orders;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_metrics_summary_type ON public.system_metrics_summary(metric_type);

-- Refresh materialized view function (for CRON)
CREATE OR REPLACE FUNCTION refresh_system_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.system_metrics_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

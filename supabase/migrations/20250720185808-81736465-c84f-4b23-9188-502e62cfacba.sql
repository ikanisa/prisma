-- Create only the missing tables (vehicle_listings already exists)

-- Data sync runs table for Google Places API quota tracking
CREATE TABLE public.data_sync_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  records_successful INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  api_quota_used INTEGER DEFAULT 0,
  error_details TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Hardware vendors table
CREATE TABLE public.hardware_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  api_endpoint TEXT,
  api_key TEXT,
  sync_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  products_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Property sync log table
CREATE TABLE public.property_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  property_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  data_before JSONB,
  data_after JSONB,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.data_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_sync_log ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
CREATE POLICY "admin_manage_data_sync_runs" ON public.data_sync_runs FOR ALL USING (is_admin());
CREATE POLICY "admin_manage_hardware_vendors" ON public.hardware_vendors FOR ALL USING (is_admin());
CREATE POLICY "admin_manage_property_sync_log" ON public.property_sync_log FOR ALL USING (is_admin());

-- Add indexes for performance
CREATE INDEX idx_data_sync_runs_status ON public.data_sync_runs(status);
CREATE INDEX idx_data_sync_runs_type ON public.data_sync_runs(sync_type);
CREATE INDEX idx_hardware_vendors_status ON public.hardware_vendors(status);
CREATE INDEX idx_property_sync_log_source ON public.property_sync_log(source);

-- Add soft delete indexes
CREATE INDEX idx_data_sync_runs_not_deleted ON public.data_sync_runs(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_hardware_vendors_not_deleted ON public.hardware_vendors(id) WHERE deleted_at IS NULL;

-- Add updated_at triggers
CREATE TRIGGER update_hardware_vendors_updated_at
  BEFORE UPDATE ON public.hardware_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create missing property_sync_log table
CREATE TABLE IF NOT EXISTS public.property_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    property_id TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    data_after JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin can manage property sync log" 
ON public.property_sync_log 
FOR ALL 
USING (is_admin());

CREATE POLICY "System can manage property sync log" 
ON public.property_sync_log 
FOR ALL 
USING (true);

-- Add more business types to the enum to support Google Places categories
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'restaurant';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'hotel';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'gas_station';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'bank';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'school';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'hospital';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'store';
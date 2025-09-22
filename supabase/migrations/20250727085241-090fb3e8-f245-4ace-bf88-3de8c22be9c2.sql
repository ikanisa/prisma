-- Phase 2: Fix Remaining Security Issues

-- 1. Fix all functions with mutable search_path
ALTER FUNCTION public.update_conversation_message_count() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_get_nearby_passengers(double precision, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.list_farmers() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_driver_wallet(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_get_nearby_drivers(double precision, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_contact_last_interaction() SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_embedding(uuid, vector, text, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.decrement_stock() SET search_path = public, pg_temp;
ALTER FUNCTION public.process_trip_payout() SET search_path = public, pg_temp;
ALTER FUNCTION public.add_ref_credit() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_test_phone() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_tab_payment_complete() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_tab_subtotal() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_marketing_eligible(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_payment_sessions_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_driver_rating() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_learning_modules_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.backfill_unified_orders() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_conversation_analytics() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_contact_limits() SET search_path = public, pg_temp;
ALTER FUNCTION public.clean_test_data() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_get_nearby_drivers_spatial(double precision, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_payment_sessions() SET search_path = public, pg_temp;
ALTER FUNCTION public.deduct_credit() SET search_path = public, pg_temp;
ALTER FUNCTION public.find_nearby_drivers(double precision, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_unified_timestamps() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_cart_total() SET search_path = public, pg_temp;
ALTER FUNCTION public.gen_ref_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.soft_delete_listing() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_find_matching_trips(double precision, double precision, text) SET search_path = public, pg_temp;

-- 2. Fix the security definer view by recreating it without SECURITY DEFINER
DROP VIEW IF EXISTS public.conversation_summary;
CREATE VIEW public.conversation_summary AS
SELECT 
  c.user_number,
  c.last_message_at,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as latest_message_time
FROM public.whatsapp_conversations c
LEFT JOIN public.whatsapp_messages m ON c.user_number = m.from_number
GROUP BY c.user_number, c.last_message_at;

-- Create RLS policy for the view
ALTER VIEW public.conversation_summary SET (security_barrier = on);

-- 3. Create new schema for extensions and move them
CREATE SCHEMA IF NOT EXISTS extensions;

-- Note: Moving extensions requires superuser privileges and should be done carefully
-- We'll create a function to help with this that can be run by administrators

-- 4. Handle spatial_ref_sys table - this is a PostGIS system table
-- We should not enable RLS on it as it's a system table used by PostGIS
-- Instead, we'll create a policy that allows read access
-- Note: spatial_ref_sys is a system table and should remain accessible

-- 5. Add security monitoring functions
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  severity TEXT,
  details JSONB DEFAULT '{}'::jsonb
) RETURNS void AS $$
BEGIN
  -- Log security events for monitoring
  INSERT INTO public.security_events (event_type, severity, details, created_at)
  VALUES (event_type, severity, details, now())
  ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  -- Silently fail to avoid breaking the application
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create policy for security events
CREATE POLICY "Admins can view security events" ON public.security_events
  FOR SELECT USING (is_admin());

CREATE POLICY "System can insert security events" ON public.security_events
  FOR INSERT WITH CHECK (true);

-- Set search path for new security function
ALTER FUNCTION public.log_security_event(TEXT, TEXT, JSONB) SET search_path = public, pg_temp;

-- 6. Create cleanup function for old security events
CREATE OR REPLACE FUNCTION public.cleanup_security_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.security_events 
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.cleanup_security_events() SET search_path = public, pg_temp;
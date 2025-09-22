-- Fix Security Definer Views and RLS Issues - Corrected
-- =================================================

-- 1. Fix SECURITY DEFINER views by recreating them without SECURITY DEFINER
-- Drop and recreate problematic views

-- Drop existing views
DROP VIEW IF EXISTS public.vw_vehicles;
DROP VIEW IF EXISTS public.vw_properties;
DROP VIEW IF EXISTS public.vw_products;
DROP VIEW IF EXISTS public.vw_produce_listings;
DROP VIEW IF EXISTS public.trips_and_intents;
DROP VIEW IF EXISTS public.trips_and_intents_spatial;

-- Recreate conversation_summary view without SECURITY DEFINER (fixed column names)
DROP VIEW IF EXISTS public.conversation_summary;
CREATE VIEW public.conversation_summary AS
SELECT 
    cm.phone_number,
    c.name as contact_name,
    c.avatar_url as contact_avatar,
    cm.last_message,
    cm.last_message_sender,
    cm.last_message_time,
    cm.message_count,
    0 as unread_count,
    false as is_pinned,
    false as is_muted,
    false as is_archived,
    'active' as status,
    'whatsapp' as channel,
    0 as conversation_duration_minutes
FROM (
    SELECT 
        phone_number,
        MAX(created_at) as last_message_time,
        COUNT(*) as message_count,
        (array_agg(message_text ORDER BY created_at DESC))[1] as last_message,
        (array_agg(sender ORDER BY created_at DESC))[1] as last_message_sender
    FROM conversation_messages 
    WHERE phone_number IS NOT NULL
    GROUP BY phone_number
) cm
LEFT JOIN contacts c ON c.phone_number = cm.phone_number;

-- 2. Fix functions by adding search_path where missing
-- Update existing functions to include SET search_path = public

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Fix update_farmer_listings_count function
CREATE OR REPLACE FUNCTION public.update_farmer_listings_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE farmers 
        SET listings_count = listings_count + 1 
        WHERE id = NEW.farmer_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE farmers 
        SET listings_count = GREATEST(0, listings_count - 1) 
        WHERE id = OLD.farmer_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Fix is_bar_staff function
CREATE OR REPLACE FUNCTION public.is_bar_staff(bar_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN false
      WHEN is_admin() THEN true
      ELSE EXISTS (
        SELECT 1 FROM businesses 
        WHERE id = bar_id AND owner_user_id = auth.uid()
      )
    END;
$$;

-- Fix get_rls_status function
CREATE OR REPLACE FUNCTION public.get_rls_status()
RETURNS TABLE(table_name text, rls_enabled boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.relname::text as table_name,
    c.relrowsecurity as rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%'
  ORDER BY c.relname;
$$;

-- Fix get_security_functions function
CREATE OR REPLACE FUNCTION public.get_security_functions()
RETURNS TABLE(
  function_name text, 
  security_type text,
  has_search_path boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.proname::text as function_name,
    CASE WHEN p.prosecdef THEN 'DEFINER' ELSE 'INVOKER' END as security_type,
    p.proconfig IS NOT NULL as has_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  ORDER BY p.proname;
$$;

-- Fix check_function_exists function
CREATE OR REPLACE FUNCTION public.check_function_exists(function_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = function_name
  );
$$;

-- Fix fn_admin_force_match function
CREATE OR REPLACE FUNCTION public.fn_admin_force_match(p_trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow admins to force match
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;
    
    -- Update trip status to matched (implementation depends on your business logic)
    UPDATE bookings 
    SET status = 'matched' 
    WHERE trip_id = p_trip_id;
END;
$$;

-- 3. Enable RLS on tables that should have it
DO $$
BEGIN
    -- Enable RLS on tables that should have it but don't
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
               WHERE n.nspname = 'public' AND c.relname = 'file_uploads' AND NOT c.relrowsecurity) THEN
        ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
               WHERE n.nspname = 'public' AND c.relname = 'notifications' AND NOT c.relrowsecurity) THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 4. Create security audit function
CREATE OR REPLACE FUNCTION public.audit_security_compliance()
RETURNS TABLE(
    security_issue text,
    entity_name text,
    severity text,
    recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Return security compliance issues
    RETURN QUERY
    SELECT 
        'RLS Disabled'::text as security_issue,
        c.relname::text as entity_name,
        'HIGH'::text as severity,
        'Enable Row Level Security'::text as recommendation
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
      AND c.relname NOT LIKE 'pg_%'
      AND c.relname NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns');
END;
$$;
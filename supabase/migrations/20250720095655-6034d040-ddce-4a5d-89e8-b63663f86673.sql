-- SECURITY HARDENING: Step 3 - Fix RLS and function security issues

-- 1. Fix function search paths for all SECURITY DEFINER functions
-- Setting search_path prevents SQL injection attacks in functions

-- Fix existing security functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_bar_staff(bar_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses 
    WHERE id = bar_id 
    AND owner_user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- 2. Create GDPR compliance functions
CREATE OR REPLACE FUNCTION public.gdpr_delete_user_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}';
  deleted_records integer := 0;
BEGIN
  -- Only allow users to delete their own data or admins to delete any data
  IF target_user_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Cannot delete data for another user';
  END IF;

  -- Delete from all user-related tables
  DELETE FROM agent_conversations WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{conversations}', to_jsonb(deleted_records));

  DELETE FROM support_tickets WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{support_tickets}', to_jsonb(deleted_records));

  DELETE FROM subscriptions WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{subscriptions}', to_jsonb(deleted_records));

  DELETE FROM customer_satisfaction WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{satisfaction}', to_jsonb(deleted_records));

  DELETE FROM businesses WHERE owner_user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{businesses}', to_jsonb(deleted_records));

  DELETE FROM drivers WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{drivers}', to_jsonb(deleted_records));

  DELETE FROM events WHERE organizer_user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{events}', to_jsonb(deleted_records));

  DELETE FROM user_roles WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_records = ROW_COUNT;
  result := jsonb_set(result, '{roles}', to_jsonb(deleted_records));

  RETURN result;
END;
$$;

-- 3. Create GDPR export function
CREATE OR REPLACE FUNCTION public.gdpr_export_user_data(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}';
  user_data jsonb;
BEGIN
  -- Only allow users to export their own data or admins to export any data
  IF target_user_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Cannot export data for another user';
  END IF;

  -- Export user conversations
  SELECT jsonb_agg(to_jsonb(ac)) INTO user_data
  FROM agent_conversations ac 
  WHERE ac.user_id = target_user_id;
  result := jsonb_set(result, '{conversations}', COALESCE(user_data, '[]'::jsonb));

  -- Export support tickets
  SELECT jsonb_agg(to_jsonb(st)) INTO user_data
  FROM support_tickets st 
  WHERE st.user_id = target_user_id;
  result := jsonb_set(result, '{support_tickets}', COALESCE(user_data, '[]'::jsonb));

  -- Export subscriptions
  SELECT jsonb_agg(to_jsonb(s)) INTO user_data
  FROM subscriptions s 
  WHERE s.user_id = target_user_id;
  result := jsonb_set(result, '{subscriptions}', COALESCE(user_data, '[]'::jsonb));

  -- Export satisfaction data
  SELECT jsonb_agg(to_jsonb(cs)) INTO user_data
  FROM customer_satisfaction cs 
  WHERE cs.user_id = target_user_id;
  result := jsonb_set(result, '{satisfaction}', COALESCE(user_data, '[]'::jsonb));

  -- Export business data
  SELECT jsonb_agg(to_jsonb(b)) INTO user_data
  FROM businesses b 
  WHERE b.owner_user_id = target_user_id;
  result := jsonb_set(result, '{businesses}', COALESCE(user_data, '[]'::jsonb));

  -- Export driver data
  SELECT jsonb_agg(to_jsonb(d)) INTO user_data
  FROM drivers d 
  WHERE d.user_id = target_user_id;
  result := jsonb_set(result, '{drivers}', COALESCE(user_data, '[]'::jsonb));

  -- Export events data
  SELECT jsonb_agg(to_jsonb(e)) INTO user_data
  FROM events e 
  WHERE e.organizer_user_id = target_user_id;
  result := jsonb_set(result, '{events}', COALESCE(user_data, '[]'::jsonb));

  -- Export roles
  SELECT jsonb_agg(to_jsonb(ur)) INTO user_data
  FROM user_roles ur 
  WHERE ur.user_id = target_user_id;
  result := jsonb_set(result, '{roles}', COALESCE(user_data, '[]'::jsonb));

  result := jsonb_set(result, '{exported_at}', to_jsonb(now()));
  result := jsonb_set(result, '{user_id}', to_jsonb(target_user_id));

  RETURN result;
END;
$$;

-- 4. Create security audit trigger function
CREATE OR REPLACE FUNCTION public.audit_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO security_events (
    event_type,
    user_id,
    details
  ) VALUES (
    TG_OP,
    auth.uid(),
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'timestamp', now()
    )
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 5. Enable RLS on any tables that might be missing it
-- Check for tables without RLS and enable it
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT IN (
            SELECT tablename 
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            WHERE c.relrowsecurity = true
            AND t.schemaname = 'public'
        )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', rec.schemaname, rec.tablename);
    END LOOP;
END
$$;

-- 6. Create rate limiting function for WhatsApp webhook
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  identifier text,
  max_requests integer DEFAULT 100,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count integer;
  window_start timestamp;
BEGIN
  window_start := now() - (window_minutes || ' minutes')::interval;
  
  -- Count requests in the current window
  SELECT COUNT(*) INTO current_count
  FROM security_events
  WHERE event_type = 'rate_limit_check'
    AND details->>'identifier' = identifier
    AND created_at > window_start;
  
  -- Log this rate limit check
  INSERT INTO security_events (
    event_type,
    details
  ) VALUES (
    'rate_limit_check',
    jsonb_build_object(
      'identifier', identifier,
      'current_count', current_count,
      'max_requests', max_requests,
      'window_minutes', window_minutes
    )
  );
  
  RETURN current_count < max_requests;
END;
$$;

-- 7. Create function to validate WhatsApp signature
CREATE OR REPLACE FUNCTION public.validate_webhook_signature(
  payload text,
  signature text,
  secret text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expected_signature text;
BEGIN
  -- This is a placeholder - actual implementation would use hmac
  -- In production, this should use proper HMAC-SHA256
  expected_signature := 'sha256=' || encode(hmac(payload, secret, 'sha256'), 'hex');
  
  -- Log signature validation attempt
  INSERT INTO security_events (
    event_type,
    details
  ) VALUES (
    'webhook_signature_validation',
    jsonb_build_object(
      'signature_valid', expected_signature = signature,
      'timestamp', now()
    )
  );
  
  RETURN expected_signature = signature;
END;
$$;
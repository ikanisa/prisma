-- ============================================================
-- CRITICAL SECURITY FIXES: Phase 1 - Fix Privilege Escalation
-- ============================================================

-- 1. Drop the dangerous "Allow first admin creation" policy
DROP POLICY IF EXISTS "Allow first admin creation" ON public.user_roles;

-- 2. Drop existing policies that may be too permissive
DROP POLICY IF EXISTS "Admin can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- 3. Create secure is_admin function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 4. Create secure role management policies
CREATE POLICY "Admin can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- 5. Users can only view their own roles (but not modify)
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6. Create audit logging for role changes
CREATE TABLE IF NOT EXISTS public.user_role_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role text,
  new_role text,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now(),
  action text NOT NULL
);

-- Enable RLS on audit table
ALTER TABLE public.user_role_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admin can view role audit"
ON public.user_role_audit
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 7. Create trigger function for audit logging
CREATE OR REPLACE FUNCTION public.audit_user_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_role_audit (user_id, new_role, changed_by, action)
    VALUES (NEW.user_id, NEW.role, auth.uid(), 'INSERT');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.user_role_audit (user_id, old_role, new_role, changed_by, action)
    VALUES (NEW.user_id, OLD.role, NEW.role, auth.uid(), 'UPDATE');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.user_role_audit (user_id, old_role, changed_by, action)
    VALUES (OLD.user_id, OLD.role, auth.uid(), 'DELETE');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 8. Create triggers for audit logging
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();

-- 9. Fix security_events table if missing policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'security_events' 
    AND schemaname = 'public'
  ) THEN
    -- Add basic policy for security_events
    CREATE POLICY "System can manage security events"
    ON public.security_events
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;
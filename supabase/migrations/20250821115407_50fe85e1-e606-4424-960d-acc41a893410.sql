-- Fix search_path security warnings by recreating functions with proper settings
CREATE OR REPLACE FUNCTION public.is_member_of(org UUID)
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
  );
$$;
CREATE OR REPLACE FUNCTION public.has_min_role(org UUID, min public.role_level)
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_role AS (
    SELECT m.role
    FROM public.memberships m
    WHERE m.org_id = org AND m.user_id = auth.uid()
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT CASE
      WHEN (SELECT role FROM my_role) = 'SYSTEM_ADMIN' THEN true
      WHEN (SELECT role FROM my_role) = 'MANAGER' AND min IN ('EMPLOYEE', 'MANAGER') THEN true
      WHEN (SELECT role FROM my_role) = 'EMPLOYEE' AND min = 'EMPLOYEE' THEN true
      ELSE false 
    END),
    false
  );
$$;
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$;

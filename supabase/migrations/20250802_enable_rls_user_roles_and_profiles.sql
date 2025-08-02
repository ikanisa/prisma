-- Enable Row Level Security and policies for user_roles and profiles tables
-- Execute this via psql or supabase migration tooling
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Admins only can view user_roles"
  ON public.user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
CREATE POLICY IF NOT EXISTS "Admins only can modify user_roles"
  ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can manage own profile"
  ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

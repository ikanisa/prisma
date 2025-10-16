-- Create necessary enums and types
CREATE TYPE public.role_level AS ENUM ('EMPLOYEE', 'MANAGER', 'SYSTEM_ADMIN');

-- Create users table linked to auth.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_system_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT,
  brand_primary TEXT DEFAULT '#6366f1',
  brand_secondary TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create memberships table (links users to organizations with roles)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.role_level NOT NULL DEFAULT 'EMPLOYEE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  industry TEXT,
  fiscal_year_end TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create engagements table
CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  is_audit_client BOOLEAN DEFAULT false,
  requires_eqr BOOLEAN DEFAULT false,
  non_audit_services JSONB DEFAULT '[]'::jsonb,
  independence_checked BOOLEAN DEFAULT false,
  independence_conclusion TEXT DEFAULT 'OK',
  independence_conclusion_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  engagement_id UUID REFERENCES public.engagements(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_member_of(org UUID)
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE
SECURITY DEFINER
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

-- RLS Policies for users table
CREATE POLICY "users_self_read" ON public.users 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_self_update" ON public.users 
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_admin_read" ON public.users 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

-- RLS Policies for organizations table
CREATE POLICY "org_read" ON public.organizations 
  FOR SELECT USING (
    public.is_member_of(id) OR 
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

CREATE POLICY "org_write" ON public.organizations 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

-- RLS Policies for memberships table
CREATE POLICY "memberships_read" ON public.memberships 
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.has_min_role(org_id, 'MANAGER'::public.role_level) OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

CREATE POLICY "memberships_write" ON public.memberships 
  FOR ALL USING (
    public.has_min_role(org_id, 'MANAGER'::public.role_level) OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

-- RLS Policies for clients table
CREATE POLICY "clients_read" ON public.clients 
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "clients_insert" ON public.clients 
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY "clients_update" ON public.clients 
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY "clients_delete" ON public.clients 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

-- RLS Policies for engagements table
CREATE POLICY "engagements_read" ON public.engagements 
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "engagements_insert" ON public.engagements 
  FOR INSERT WITH CHECK (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY "engagements_update" ON public.engagements 
  FOR UPDATE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

CREATE POLICY "engagements_delete" ON public.engagements 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_system_admin = true)
  );

-- RLS Policies for tasks table
CREATE POLICY "tasks_read" ON public.tasks 
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "tasks_insert" ON public.tasks 
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY "tasks_update" ON public.tasks 
  FOR UPDATE USING (
    public.is_member_of(org_id) AND 
    (assigned_to = auth.uid() OR public.has_min_role(org_id, 'MANAGER'::public.role_level))
  );

CREATE POLICY "tasks_delete" ON public.tasks 
  FOR DELETE USING (public.has_min_role(org_id, 'MANAGER'::public.role_level));

-- RLS Policies for documents table
CREATE POLICY "documents_read" ON public.documents 
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "documents_insert" ON public.documents 
  FOR INSERT WITH CHECK (public.is_member_of(org_id) AND uploaded_by = auth.uid());

CREATE POLICY "documents_update" ON public.documents 
  FOR UPDATE USING (
    public.is_member_of(org_id) AND 
    (uploaded_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'::public.role_level))
  );

CREATE POLICY "documents_delete" ON public.documents 
  FOR DELETE USING (
    public.is_member_of(org_id) AND 
    (uploaded_by = auth.uid() OR public.has_min_role(org_id, 'MANAGER'::public.role_level))
  );

-- RLS Policies for notifications table
CREATE POLICY "notifications_read" ON public.notifications 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications 
  FOR INSERT WITH CHECK (public.is_member_of(org_id));

CREATE POLICY "notifications_update" ON public.notifications 
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications 
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for activity_log table
CREATE POLICY "activity_log_read" ON public.activity_log 
  FOR SELECT USING (public.is_member_of(org_id));

CREATE POLICY "activity_log_insert" ON public.activity_log 
  FOR INSERT WITH CHECK (public.is_member_of(org_id) AND user_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables with updated_at columns
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_memberships_updated_at BEFORE UPDATE ON public.memberships 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_engagements_updated_at BEFORE UPDATE ON public.engagements 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON public.tasks 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();;

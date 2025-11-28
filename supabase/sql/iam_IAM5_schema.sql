-- IAM-5 client portal scoping tweaks (PBC repositories)
set check_function_bodies = off;

ALTER TABLE IF EXISTS public.documents
  ADD COLUMN IF NOT EXISTS portal_visible boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS public.tasks
  ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT false;
  ADD COLUMN IF NOT EXISTS client_assignee_id uuid REFERENCES public.user_profiles(id);

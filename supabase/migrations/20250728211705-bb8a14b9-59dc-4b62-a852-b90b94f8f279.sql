-- Add missing status column to users table
ALTER TABLE public.users 
ADD COLUMN status TEXT DEFAULT 'active' NOT NULL;
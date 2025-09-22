-- Drop deprecated/stale tables safely
-- Review before applying in production
DROP TABLE IF EXISTS public.old_sessions;
DROP TABLE IF EXISTS public.temp_data;
-- Add additional DROP TABLE statements below as needed

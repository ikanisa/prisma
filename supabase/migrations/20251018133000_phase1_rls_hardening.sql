-- Phase 1 stabilization: tighten access to Prisma migrations and system settings tables

BEGIN;

-- Ensure Prisma migrations metadata is protected (service role only)
ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prisma_migrations_service_role" ON public._prisma_migrations;
DROP POLICY IF EXISTS "prisma_migrations_service_role" ON _prisma_migrations CASCADE;
CREATE POLICY "prisma_migrations_service_role"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Protect application system settings table (read-only for service role)
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_service_role" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_service_role" ON system_settings CASCADE;
CREATE POLICY "system_settings_service_role"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMIT;

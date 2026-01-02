-- RLS remediation following audit of Supabase + Prisma schemas
-- Tables lacking policies:
--   - public.notification_dispatch_queue (new async fanout queue)
--   - public.system_settings (created after initial service-role hardening)

ALTER TABLE public.notification_dispatch_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role notification dispatch queue" ON public.notification_dispatch_queue;
DROP POLICY IF EXISTS "Service role notification dispatch queue" ON notification_dispatch_queue CASCADE;
CREATE POLICY "Service role notification dispatch queue"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings_service_role" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_service_role" ON system_settings CASCADE;
CREATE POLICY "system_settings_service_role"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

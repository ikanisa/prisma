set check_function_bodies = off;

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS system_settings_singleton_idx
  ON public.system_settings ((true));

DROP TRIGGER IF EXISTS trg_system_settings_touch ON public.system_settings;
CREATE TRIGGER trg_system_settings_touch
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();


-- Create the set_config function for session management
CREATE OR REPLACE FUNCTION public.set_config(
  setting_name TEXT,
  setting_value TEXT,
  is_local BOOLEAN DEFAULT false
) RETURNS VOID AS $$
BEGIN
  -- This function allows setting configuration values for the session
  -- Used primarily for setting session_id for Row Level Security
  PERFORM set_config(setting_name, setting_value, is_local);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, TEXT, BOOLEAN) TO authenticated, anon;

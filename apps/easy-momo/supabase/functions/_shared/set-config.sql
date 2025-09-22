
CREATE OR REPLACE FUNCTION set_config(
  setting_name TEXT,
  setting_value TEXT,
  is_local BOOLEAN DEFAULT false
) RETURNS TEXT AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, is_local);
  RETURN setting_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

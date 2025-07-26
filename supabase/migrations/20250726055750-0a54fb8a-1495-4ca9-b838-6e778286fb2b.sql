-- Fix security issue: Add search_path to SECURITY DEFINER function

DROP FUNCTION IF EXISTS public.update_agent_assistant_id();

CREATE OR REPLACE FUNCTION public.update_agent_assistant_id()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will be called by edge function to set the actual OPENAI_ASSISTANT_ID
  UPDATE public.agent_configs 
  SET assistant_id = 'env_placeholder'
  WHERE code = 'easymo_main' AND assistant_id = 'default_assistant_id';
END;
$$;
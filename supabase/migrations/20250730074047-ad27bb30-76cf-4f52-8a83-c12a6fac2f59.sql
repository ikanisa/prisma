-- Create template usage logs table
CREATE TABLE IF NOT EXISTS public.template_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  intent TEXT NOT NULL,
  button_count INTEGER NOT NULL DEFAULT 0,
  user_phone TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create template rendering logs table
CREATE TABLE IF NOT EXISTS public.template_rendering_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  user_phone TEXT NOT NULL,
  rendered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  render_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_details TEXT
);

-- Create whatsapp template buttons table
CREATE TABLE IF NOT EXISTS public.whatsapp_template_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL,
  button_text TEXT NOT NULL,
  button_type TEXT NOT NULL DEFAULT 'reply',
  payload JSONB DEFAULT '{}'::jsonb,
  button_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.template_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_rendering_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_buttons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for template usage logs
CREATE POLICY "System can manage template usage logs" 
ON public.template_usage_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for template rendering logs
CREATE POLICY "System can manage template rendering logs" 
ON public.template_rendering_logs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for template buttons
CREATE POLICY "System can manage template buttons" 
ON public.whatsapp_template_buttons 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_usage_logs_domain_intent ON template_usage_logs(domain, intent);
CREATE INDEX IF NOT EXISTS idx_template_usage_logs_timestamp ON template_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_template_rendering_logs_template_id ON template_rendering_logs(template_id);
CREATE INDEX IF NOT EXISTS idx_template_rendering_logs_rendered_at ON template_rendering_logs(rendered_at);
CREATE INDEX IF NOT EXISTS idx_template_buttons_template_id ON whatsapp_template_buttons(template_id);

-- Create function to update button timestamps
CREATE OR REPLACE FUNCTION public.update_template_button_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for template buttons
CREATE TRIGGER update_template_buttons_updated_at
  BEFORE UPDATE ON public.whatsapp_template_buttons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_template_button_updated_at();
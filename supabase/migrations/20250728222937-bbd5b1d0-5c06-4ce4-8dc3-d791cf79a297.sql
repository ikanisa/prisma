-- Create WhatsApp templates and versions tables
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_meta TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('utility', 'marketing', 'authentication')),
    domain TEXT NOT NULL,
    intent TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    header JSONB,
    body TEXT NOT NULL,
    footer TEXT,
    buttons JSONB DEFAULT '[]'::jsonb,
    components JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'deleted')),
    meta_template_id TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_template_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.whatsapp_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    diff JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_code TEXT,
    recipient TEXT NOT NULL,
    message_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    variables JSONB DEFAULT '{}'::jsonb,
    response_payload JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_code ON public.whatsapp_templates(code);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_domain_intent ON public.whatsapp_templates(domain, intent);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_meta_id ON public.whatsapp_templates(meta_template_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_template_versions_template ON public.whatsapp_template_versions(template_id, version);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON public.whatsapp_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage templates" ON public.whatsapp_templates
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage template versions" ON public.whatsapp_template_versions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "System can manage WhatsApp logs" ON public.whatsapp_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_whatsapp_templates_updated_at
    BEFORE UPDATE ON public.whatsapp_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_templates_updated_at();
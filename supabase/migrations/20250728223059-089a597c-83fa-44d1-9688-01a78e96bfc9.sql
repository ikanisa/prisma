-- Drop existing tables if they exist
DROP TABLE IF EXISTS public.whatsapp_template_versions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_templates CASCADE;
DROP TABLE IF EXISTS public.whatsapp_logs CASCADE;

-- Create WhatsApp templates table
CREATE TABLE public.whatsapp_templates (
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

-- Create WhatsApp template versions table
CREATE TABLE public.whatsapp_template_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES public.whatsapp_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    diff JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create WhatsApp logs table
CREATE TABLE public.whatsapp_logs (
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
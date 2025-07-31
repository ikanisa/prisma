-- ENUMS
CREATE TYPE wapp_component_type AS ENUM ('HEADER', 'BODY', 'FOOTER');
CREATE TYPE wapp_button_type AS ENUM ('QUICK_REPLY', 'URL', 'CALL_PHONE', 'COPY_CODE', 'FLOW', 'CATALOG', 'LIST');
CREATE TYPE wapp_language_code AS ENUM ('en', 'rw', 'fr', 'sw');
CREATE TYPE wapp_template_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DEPRECATED');
CREATE TYPE wapp_flow_field_type AS ENUM ('TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'DATETIME', 'LOCATION', 'PHONE', 'EMAIL', 'SELECT', 'MULTI_SELECT', 'MEDIA_UPLOAD');
CREATE TYPE wapp_sync_direction AS ENUM ('PUSH', 'PULL');

-- CORE TEMPLATE TABLE
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                     -- e.g. TPL_WELCOME_MAIN
  domain TEXT NOT NULL,                          -- payments|mobility|ordering|listings|marketing|system
  intent_ids TEXT[] NOT NULL DEFAULT '{}',       -- list of intents this template can serve
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT TRUE,
  ab_group TEXT DEFAULT 'A'                      -- for A/B testing (optional)
);

-- VERSION / LANGUAGE (Meta cares by language)
CREATE TABLE public.whatsapp_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.whatsapp_templates(id) ON DELETE CASCADE,
  language wapp_language_code NOT NULL,
  meta_name TEXT NOT NULL,                       -- exact name registered at Meta
  category TEXT NOT NULL DEFAULT 'UTILITY',      -- UTILITY, AUTHENTICATION, MARKETING (Meta categories)
  status wapp_template_status NOT NULL DEFAULT 'PENDING',
  reason TEXT,                                   -- rejection reason etc.
  sample_json JSONB,                             -- sample variables provided to Meta
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_id, language)
);

-- COMPONENTS (HEADER/BODY/FOOTER)
CREATE TABLE public.whatsapp_template_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.whatsapp_template_versions(id) ON DELETE CASCADE,
  component_type wapp_component_type NOT NULL,
  text TEXT,                                     -- text with {{1}}, {{2}}
  format TEXT,                                   -- 'TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT' (Meta supports media header)
  media_id TEXT,                                 -- if media header (persisted at Meta)
  json_payload JSONB,                            -- for advanced formats (variables, example params)
  position SMALLINT NOT NULL DEFAULT 1
);

-- BUTTONS
CREATE TABLE public.whatsapp_template_buttons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.whatsapp_template_versions(id) ON DELETE CASCADE,
  btn_type wapp_button_type NOT NULL,
  text TEXT NOT NULL,                            -- label / display text
  url TEXT,                                      -- for URL buttons (with {{1}} support)
  phone_number TEXT,                             -- for CALL_PHONE
  flow_id UUID REFERENCES public.whatsapp_flows(id),
  list_reference UUID,                           -- pre-canned list pointer (optional)
  payload_key TEXT,                              -- custom payload ('PAY', 'GET_PAID')
  position SMALLINT NOT NULL DEFAULT 1
);

-- FLOWS (WhatsApp native forms)
CREATE TABLE public.whatsapp_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                     -- e.g. FLOW_GET_PAID
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL,
  intent_ids TEXT[] NOT NULL DEFAULT '{}',
  meta_flow_id TEXT,                              -- ID from Meta if created via APIs
  status wapp_template_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.whatsapp_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.whatsapp_flows(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,                         -- 'amount_entry', 'pickup_step'
  title TEXT,
  description TEXT,
  position SMALLINT NOT NULL DEFAULT 1,
  UNIQUE(flow_id, step_key)
);

CREATE TABLE public.whatsapp_flow_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.whatsapp_flow_steps(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,                        -- 'amount', 'momo_number'
  label TEXT NOT NULL,
  field_type wapp_flow_field_type NOT NULL,
  placeholder TEXT,
  required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  options JSONB,                                  -- for SELECT: [{value:'bar', label:'Bar'}]
  validation_regex TEXT,
  helper_text TEXT,
  position SMALLINT NOT NULL DEFAULT 1,
  UNIQUE(step_id, field_key)
);

-- INTERACTIVE LIST BLUEPRINTS
CREATE TABLE public.whatsapp_interactive_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                     -- e.g. LIST_NEARBY_DRIVERS
  title TEXT NOT NULL,
  body TEXT,
  footer TEXT,
  sections JSONB NOT NULL,                       -- [{title:'Closest', rows:[{id:'dr_123', title:'John (500m)', description:'...'}]}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  domain TEXT,
  intent_ids TEXT[] DEFAULT '{}'
);

-- VARIABLE CATALOG (allowed substitution keys & validators)
CREATE TABLE public.whatsapp_variables_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  var_key TEXT UNIQUE NOT NULL,                  -- {{amount}}, {{pickup}}, etc.
  description TEXT,
  required BOOLEAN DEFAULT FALSE,
  validator_regex TEXT,
  example_value TEXT
);

-- INTENT ↔ TEMPLATE/ FLOW BINDING
CREATE TABLE public.whatsapp_template_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id TEXT NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 10,
  template_version_id UUID REFERENCES public.whatsapp_template_versions(id),
  flow_id UUID REFERENCES public.whatsapp_flows(id),
  list_id UUID REFERENCES public.whatsapp_interactive_lists(id),
  fallback_plain TEXT,                            -- fallback text if template fails
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- MEDIA ASSETS (for QR images, product photos)
CREATE TABLE public.whatsapp_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,                    -- supabase storage path
  meta_media_id TEXT,                            -- uploaded media id at Meta
  mime_type TEXT,
  width INT,
  height INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- USAGE LOG
CREATE TABLE public.whatsapp_template_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID REFERENCES public.whatsapp_template_versions(id),
  flow_id UUID REFERENCES public.whatsapp_flows(id),
  list_id UUID REFERENCES public.whatsapp_interactive_lists(id),
  recipient_phone TEXT,
  message_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  latency_ms INT,
  success BOOLEAN DEFAULT TRUE,
  error_code TEXT,
  error_message TEXT,
  cost NUMERIC(10,4),
  context JSONB                                    -- extra (intent, vars)
);

-- SYNC JOBS
CREATE TABLE public.whatsapp_template_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction wapp_sync_direction NOT NULL,
  payload JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  success BOOLEAN,
  error TEXT
);

-- BASIC RLS (adjust roles according to your auth model)
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_buttons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_interactive_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_template_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_variables_catalog ENABLE ROW LEVEL SECURITY;

-- Admin access policies
CREATE POLICY "allow_admin_all_templates" ON public.whatsapp_templates
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_versions" ON public.whatsapp_template_versions  
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_components" ON public.whatsapp_template_components
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_buttons" ON public.whatsapp_template_buttons
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_flows" ON public.whatsapp_flows
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_flow_steps" ON public.whatsapp_flow_steps
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_flow_fields" ON public.whatsapp_flow_fields
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_lists" ON public.whatsapp_interactive_lists
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_bindings" ON public.whatsapp_template_bindings
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_usage_log" ON public.whatsapp_template_usage_log
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_sync_jobs" ON public.whatsapp_template_sync_jobs
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_media_assets" ON public.whatsapp_media_assets
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_admin_all_variables_catalog" ON public.whatsapp_variables_catalog
  FOR ALL USING (true) WITH CHECK (true);
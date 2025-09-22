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
  flow_id UUID,
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

-- Add foreign key reference for buttons
ALTER TABLE public.whatsapp_template_buttons 
ADD CONSTRAINT fk_buttons_flow_id 
FOREIGN KEY (flow_id) REFERENCES public.whatsapp_flows(id);

-- Add more table for dynamic learning and journey patterns
CREATE TABLE public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name TEXT NOT NULL,
  skill_category TEXT NOT NULL,
  competency_level NUMERIC DEFAULT 0.5,
  confidence_score NUMERIC DEFAULT 0.5,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  learning_count INTEGER DEFAULT 0,
  success_rate NUMERIC DEFAULT 0.0,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.agent_persona_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_name TEXT NOT NULL,
  trait_value TEXT NOT NULL,
  confidence_level NUMERIC DEFAULT 0.5,
  source_type TEXT DEFAULT 'document',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.user_journey_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  success_probability NUMERIC DEFAULT 0.5,
  completion_rate NUMERIC DEFAULT 0.0,
  steps JSONB NOT NULL,
  triggers JSONB DEFAULT '{}',
  outcomes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.dynamic_journey_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_phone TEXT NOT NULL,
  pattern_id UUID REFERENCES public.user_journey_patterns(id),
  current_step TEXT,
  step_data JSONB DEFAULT '{}',
  completion_percentage NUMERIC DEFAULT 0.0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT DEFAULT 'active'
);

CREATE TABLE public.agent_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_name TEXT NOT NULL,
  capability_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  performance_score NUMERIC DEFAULT 0.5,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- BASIC RLS
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
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_persona_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journey_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_journey_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_capabilities ENABLE ROW LEVEL SECURITY;

-- Example generic policy (admin-only write, read-all)
CREATE POLICY "allow_read_all_templates" ON public.whatsapp_templates
  FOR SELECT USING (true);

CREATE POLICY "system_manage_whatsapp_templates" ON public.whatsapp_templates
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_template_versions" ON public.whatsapp_template_versions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_template_components" ON public.whatsapp_template_components
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_template_buttons" ON public.whatsapp_template_buttons
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_flows" ON public.whatsapp_flows
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_flow_steps" ON public.whatsapp_flow_steps
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_flow_fields" ON public.whatsapp_flow_fields
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_interactive_lists" ON public.whatsapp_interactive_lists
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_template_bindings" ON public.whatsapp_template_bindings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_template_usage_log" ON public.whatsapp_template_usage_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_template_sync_jobs" ON public.whatsapp_template_sync_jobs
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_media_assets" ON public.whatsapp_media_assets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_variables_catalog" ON public.whatsapp_variables_catalog
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_agent_skills" ON public.agent_skills
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_agent_persona_traits" ON public.agent_persona_traits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_user_journey_patterns" ON public.user_journey_patterns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_dynamic_journey_patterns" ON public.dynamic_journey_patterns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "system_manage_agent_capabilities" ON public.agent_capabilities
  FOR ALL USING (true) WITH CHECK (true);

-- Insert seed data for core templates and flows
INSERT INTO whatsapp_templates (code, domain, intent_ids, description) VALUES
('TPL_WELCOME_MAIN', 'system', ARRAY['welcome','unknown'], 'Main entry point with quick actions'),
('TPL_PAYMENT_QR', 'payments', ARRAY['get_paid_generate_qr'], 'QR code generation template'),
('TPL_PAYMENT_SCAN', 'payments', ARRAY['pay_qr_scan'], 'QR payment scanner template');

INSERT INTO whatsapp_flows (code, title, description, domain, intent_ids, status) VALUES
('FLOW_GET_PAID', 'Receive Money', 'Collect amount and MoMo number to generate QR', 'payments', ARRAY['get_paid_generate_qr'], 'APPROVED'),
('FLOW_BOOK_RIDE', 'Book a Ride', 'Collect pickup and destination for ride booking', 'mobility', ARRAY['passenger_book_ride'], 'APPROVED'),
('FLOW_CREATE_LISTING', 'Create Listing', 'Create property or vehicle listing', 'listings', ARRAY['create_listing'], 'APPROVED');

INSERT INTO whatsapp_interactive_lists (code, title, body, footer, sections, domain, intent_ids) VALUES
('LIST_NEARBY_DRIVERS', 'Drivers near you', 'Pick one to chat & book:', 'easyMO mobility', 
 '[{"title":"Closest","rows":[{"id":"DRV_123","title":"Eric (400m)","description":"Kimironko → CBD, 5 min"},{"id":"DRV_456","title":"Ange (600m)","description":"Remera → Nyamirambo"}]},{"title":"Others","rows":[{"id":"DRV_789","title":"John (1.2km)","description":"Free now"}]}]'::jsonb,
 'mobility', ARRAY['passenger_view_drivers']),
('LIST_PAYMENT_OPTIONS', 'Payment Options', 'Choose how you want to pay:', 'easyMO payments',
 '[{"title":"Quick Actions","rows":[{"id":"PAY_QR","title":"🔍 Scan QR Code","description":"Pay by scanning QR"},{"id":"GET_PAID","title":"💰 Get Paid","description":"Generate QR to receive money"}]}]'::jsonb,
 'payments', ARRAY['payment_options']);

-- Insert some agent skills
INSERT INTO agent_skills (skill_name, skill_category, competency_level, confidence_score) VALUES
('Payment Processing', 'payments', 0.9, 0.85),
('Trip Booking', 'mobility', 0.8, 0.75),
('Product Ordering', 'commerce', 0.7, 0.70),
('Listing Management', 'listings', 0.6, 0.65),
('Customer Support', 'support', 0.8, 0.80),
('Language Processing', 'communication', 0.9, 0.90);

-- Insert agent persona traits
INSERT INTO agent_persona_traits (trait_name, trait_value, confidence_level) VALUES
('communication_style', 'friendly_professional', 0.9),
('language_preference', 'multilingual_rwanda_focus', 0.95),
('response_tone', 'helpful_efficient', 0.85),
('cultural_awareness', 'rwanda_local_context', 0.90),
('business_focus', 'mobile_money_transport_commerce', 0.88);

-- Insert user journey patterns
INSERT INTO user_journey_patterns (pattern_name, pattern_type, success_probability, completion_rate, steps, triggers, outcomes) VALUES
('Payment QR Generation', 'payment_flow', 0.85, 0.78, 
 '["greet_user", "identify_payment_intent", "collect_amount", "collect_momo", "generate_qr", "confirm_generation"]'::jsonb,
 '{"keywords": ["get paid", "receive money", "qr"], "intents": ["get_paid_generate_qr"]}'::jsonb,
 '{"success": "qr_generated", "failure": "abandoned_flow"}'::jsonb),
('Ride Booking', 'mobility_flow', 0.75, 0.65,
 '["greet_user", "identify_ride_intent", "collect_pickup", "collect_destination", "show_drivers", "confirm_booking"]'::jsonb,
 '{"keywords": ["ride", "transport", "go to"], "intents": ["passenger_book_ride"]}'::jsonb,
 '{"success": "ride_booked", "failure": "no_drivers_found"}'::jsonb);

-- Insert agent capabilities
INSERT INTO agent_capabilities (capability_name, capability_type, enabled, performance_score) VALUES
('QR Code Generation', 'payment', TRUE, 0.90),
('Location Processing', 'spatial', TRUE, 0.85),
('Multi-language Support', 'communication', TRUE, 0.92),
('Intent Recognition', 'ai', TRUE, 0.88),
('Memory Management', 'cognitive', TRUE, 0.80),
('Template Selection', 'messaging', TRUE, 0.85);
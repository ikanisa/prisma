-- Seed basic WhatsApp templates
INSERT INTO public.whatsapp_templates (code, domain, intent_ids, description, is_active, ab_group)
VALUES 
('TPL_WELCOME_MAIN', 'system', ARRAY['welcome','unknown'], 'Main entry point with quick actions', true, 'A'),
('TPL_PAYMENT_QR', 'payments', ARRAY['get_paid_generate_qr'], 'QR code generation confirmation', true, 'A'),
('TPL_TRIP_CONFIRMATION', 'mobility', ARRAY['trip_confirmed'], 'Trip booking confirmation', true, 'A'),
('TPL_LISTING_CREATED', 'listings', ARRAY['listing_created'], 'Listing creation confirmation', true, 'A');

-- Get template IDs for versions
INSERT INTO public.whatsapp_template_versions (template_id, language, meta_name, category, status)
SELECT 
  t.id,
  'en',
  CASE 
    WHEN t.code = 'TPL_WELCOME_MAIN' THEN 'easymo_welcome_main_en'
    WHEN t.code = 'TPL_PAYMENT_QR' THEN 'easymo_payment_qr_en'
    WHEN t.code = 'TPL_TRIP_CONFIRMATION' THEN 'easymo_trip_confirm_en'
    WHEN t.code = 'TPL_LISTING_CREATED' THEN 'easymo_listing_created_en'
  END,
  'UTILITY',
  'APPROVED'
FROM public.whatsapp_templates t;

-- Add components for welcome template
INSERT INTO public.whatsapp_template_components (version_id, component_type, text, format, position)
SELECT 
  v.id,
  'HEADER',
  'Welcome to easyMO 🚀',
  'TEXT',
  1
FROM public.whatsapp_template_versions v
JOIN public.whatsapp_templates t ON v.template_id = t.id
WHERE t.code = 'TPL_WELCOME_MAIN' AND v.language = 'en';

INSERT INTO public.whatsapp_template_components (version_id, component_type, text, format, position)
SELECT 
  v.id,
  'BODY',
  'Choose what you need:',
  'TEXT',
  2
FROM public.whatsapp_template_versions v
JOIN public.whatsapp_templates t ON v.template_id = t.id
WHERE t.code = 'TPL_WELCOME_MAIN' AND v.language = 'en';

INSERT INTO public.whatsapp_template_components (version_id, component_type, text, format, position)
SELECT 
  v.id,
  'FOOTER',
  'Powered by easyMO',
  'TEXT',
  3
FROM public.whatsapp_template_versions v
JOIN public.whatsapp_templates t ON v.template_id = t.id
WHERE t.code = 'TPL_WELCOME_MAIN' AND v.language = 'en';

-- Add buttons for welcome template
INSERT INTO public.whatsapp_template_buttons (version_id, btn_type, text, payload_key, position)
SELECT 
  v.id,
  'QUICK_REPLY',
  'Pay',
  'PAY',
  1
FROM public.whatsapp_template_versions v
JOIN public.whatsapp_templates t ON v.template_id = t.id
WHERE t.code = 'TPL_WELCOME_MAIN' AND v.language = 'en';

INSERT INTO public.whatsapp_template_buttons (version_id, btn_type, text, payload_key, position)
SELECT 
  v.id,
  'QUICK_REPLY',
  'Get Paid',
  'GET_PAID',
  2
FROM public.whatsapp_template_versions v
JOIN public.whatsapp_templates t ON v.template_id = t.id
WHERE t.code = 'TPL_WELCOME_MAIN' AND v.language = 'en';

INSERT INTO public.whatsapp_template_buttons (version_id, btn_type, text, payload_key, position)
SELECT 
  v.id,
  'QUICK_REPLY',
  'Find Ride',
  'FIND_RIDE',
  3
FROM public.whatsapp_template_versions v
JOIN public.whatsapp_templates t ON v.template_id = t.id
WHERE t.code = 'TPL_WELCOME_MAIN' AND v.language = 'en';

-- Create basic flows
INSERT INTO public.whatsapp_flows (code, title, description, domain, intent_ids, status)
VALUES 
('FLOW_GET_PAID', 'Receive Money', 'Collect amount and MoMo number to generate QR', 'payments', ARRAY['get_paid_generate_qr'], 'APPROVED'),
('FLOW_BOOK_TRIP', 'Book Trip', 'Collect pickup and dropoff locations', 'mobility', ARRAY['book_trip'], 'APPROVED'),
('FLOW_CREATE_LISTING', 'Create Listing', 'Collect property or vehicle details', 'listings', ARRAY['create_listing'], 'APPROVED');

-- Add flow steps for get paid flow
INSERT INTO public.whatsapp_flow_steps (flow_id, step_key, title, description, position)
SELECT 
  f.id,
  'amount_step',
  'Amount (optional)',
  'Enter or skip amount',
  1
FROM public.whatsapp_flows f
WHERE f.code = 'FLOW_GET_PAID';

INSERT INTO public.whatsapp_flow_steps (flow_id, step_key, title, description, position)
SELECT 
  f.id,
  'momo_step',
  'MoMo Number',
  'Confirm or edit your MoMo number',
  2
FROM public.whatsapp_flows f
WHERE f.code = 'FLOW_GET_PAID';

-- Add flow fields
INSERT INTO public.whatsapp_flow_fields (step_id, field_key, label, field_type, placeholder, required, validation_regex, position)
SELECT 
  s.id,
  'amount',
  'Amount (RWF)',
  'NUMBER',
  'e.g. 2500',
  false,
  '^[0-9]{1,9}$',
  1
FROM public.whatsapp_flow_steps s
JOIN public.whatsapp_flows f ON s.flow_id = f.id
WHERE f.code = 'FLOW_GET_PAID' AND s.step_key = 'amount_step';

INSERT INTO public.whatsapp_flow_fields (step_id, field_key, label, field_type, placeholder, required, validation_regex, position, default_value)
SELECT 
  s.id,
  'momo_number',
  'MoMo Number',
  'PHONE',
  '07xx...',
  true,
  '^\\+?\\d{9,15}$',
  1,
  '{{memory.momo_number}}'
FROM public.whatsapp_flow_steps s
JOIN public.whatsapp_flows f ON s.flow_id = f.id
WHERE f.code = 'FLOW_GET_PAID' AND s.step_key = 'momo_step';

-- Create interactive lists
INSERT INTO public.whatsapp_interactive_lists (code, title, body, footer, sections, domain, intent_ids)
VALUES (
  'LIST_NEARBY_DRIVERS',
  'Drivers near you',
  'Pick one to chat & book:',
  'easyMO mobility',
  '[
     {"title":"Closest","rows":[{"id":"DRV_123","title":"Eric (400m)","description":"Kimironko → CBD, 5 min"},{"id":"DRV_456","title":"Ange (600m)","description":"Remera → Nyamirambo"}]},
     {"title":"Others","rows":[{"id":"DRV_789","title":"John (1.2km)","description":"Free now"}]}
   ]'::jsonb,
  'mobility',
  ARRAY['passenger_view_drivers']
);

-- Create variables catalog
INSERT INTO public.whatsapp_variables_catalog (var_key, description, required, validator_regex, example_value)
VALUES 
('amount', 'Payment amount in RWF', false, '^[0-9]{1,9}$', '2500'),
('pickup', 'Pickup location', true, '^.{3,100}$', 'Kimironko'),
('dropoff', 'Dropoff location', true, '^.{3,100}$', 'CBD'),
('name', 'User name', false, '^[A-Za-z\\s]{2,50}$', 'John Doe'),
('phone', 'Phone number', true, '^\\+?\\d{9,15}$', '+250123456789'),
('momo_number', 'Mobile money number', true, '^\\+?\\d{9,15}$', '+250123456789');

-- Create template bindings
INSERT INTO public.whatsapp_template_bindings (intent_id, priority, template_version_id, fallback_plain)
SELECT 
  'welcome',
  1,
  v.id,
  'Welcome to easyMO! Reply with: PAY, GET_PAID, RIDE, HELP'
FROM public.whatsapp_template_versions v
JOIN public.whatsapp_templates t ON v.template_id = t.id
WHERE t.code = 'TPL_WELCOME_MAIN' AND v.language = 'en';

INSERT INTO public.whatsapp_template_bindings (intent_id, priority, flow_id, fallback_plain)
SELECT 
  'get_paid_generate_qr',
  1,
  f.id,
  'Please provide your MoMo number to generate QR code'
FROM public.whatsapp_flows f
WHERE f.code = 'FLOW_GET_PAID';
-- Insert Phase 1 action button templates for all domains (Fixed array syntax)

-- Payments Domain Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, priority, created_by) VALUES
('Generate QR', 'PAY_QR', 'payments', 'receive_money', ARRAY['qr_code', 'instant_pay'], 10, 'persona_v1'),
('Scan QR', 'PAY_SCAN', 'payments', 'send_money', ARRAY['qr_scan', 'quick_pay'], 10, 'persona_v1'),
('Send Money', 'PAY_SEND', 'payments', 'transfer', ARRAY['transfer', 'momo'], 9, 'persona_v1'),
('Check Status', 'PAY_STATUS', 'payments', 'status_check', ARRAY['transaction', 'history'], 8, 'persona_v1'),
('Pay Bills', 'PAY_BILLS', 'payments', 'bill_payment', ARRAY['utilities', 'services'], 8, 'persona_v1');

-- Mobility Domain Templates  
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, priority, created_by) VALUES
('📍 Share Location', 'MOB_LOC', 'mobility', 'location_share', ARRAY['geo', 'pickup'], 10, 'persona_v1'),
('Find Driver', 'MOB_DRV', 'mobility', 'find_driver', ARRAY['moto', 'ride'], 9, 'persona_v1'),
('Find Passengers', 'MOB_PAX', 'mobility', 'find_passengers', ARRAY['driver', 'pickup'], 9, 'persona_v1'),
('Post Trip', 'MOB_POST', 'mobility', 'create_trip', ARRAY['schedule', 'route'], 8, 'persona_v1'),
('Driver Signup', 'MOB_SIGNUP', 'mobility', 'driver_onboarding', ARRAY['partner', 'register'], 7, 'persona_v1');

-- Commerce/Ordering Domain Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, priority, created_by) VALUES
('🍺 Bars', 'ORD_BAR', 'commerce', 'find_bars', ARRAY['drinks', 'nightlife'], 9, 'persona_v1'),
('💊 Pharmacies', 'ORD_PHAR', 'commerce', 'find_pharmacy', ARRAY['medicine', 'health'], 10, 'persona_v1'),
('🔧 Hardware', 'ORD_HW', 'commerce', 'find_hardware', ARRAY['tools', 'supplies'], 8, 'persona_v1'),
('🌾 Farmers', 'ORD_FARM', 'commerce', 'find_farmers', ARRAY['produce', 'fresh'], 8, 'persona_v1'),
('Register Business', 'ORD_BIZ_REG', 'commerce', 'business_onboarding', ARRAY['partner', 'merchant'], 7, 'persona_v1');

-- Listings Domain Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, priority, created_by) VALUES
('🏠 List Property', 'LST_PROP', 'listings', 'create_property_listing', ARRAY['rent', 'sale', 'house'], 9, 'persona_v1'),
('🔍 Find Property', 'LST_PROP_FIND', 'listings', 'search_property', ARRAY['rent', 'buy', 'apartment'], 9, 'persona_v1'),
('🚗 List Vehicle', 'LST_VEH', 'listings', 'create_vehicle_listing', ARRAY['car', 'moto', 'sell'], 8, 'persona_v1'),
('🔍 Find Vehicle', 'LST_VEH_FIND', 'listings', 'search_vehicle', ARRAY['buy', 'rent', 'transport'], 9, 'persona_v1');

-- Support & General Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, priority, created_by) VALUES
('💬 Talk to Human', 'SUP_HUMAN', 'support', 'escalate', ARRAY['help', 'agent'], 10, 'persona_v1'),
('📋 Help Menu', 'SUP_MENU', 'support', 'show_help', ARRAY['guidance', 'options'], 9, 'persona_v1'),
('🌍 Change Language', 'SUP_LANG', 'support', 'change_language', ARRAY['kinyarwanda', 'english'], 8, 'persona_v1'),
('📊 My Account', 'SUP_ACCOUNT', 'support', 'account_info', ARRAY['profile', 'settings'], 8, 'persona_v1');
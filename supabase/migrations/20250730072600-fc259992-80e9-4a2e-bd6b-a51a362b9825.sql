-- Insert Phase 1 action button templates for all domains

-- Payments Domain Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, confidence_score) VALUES
('Generate QR', 'PAY_QR', 'payments', 'receive_money', '["qr_code", "instant_pay"]', 0.95),
('Scan QR', 'PAY_SCAN', 'payments', 'send_money', '["qr_scan", "quick_pay"]', 0.95),
('Send Money', 'PAY_SEND', 'payments', 'transfer', '["transfer", "momo"]', 0.90),
('Check Status', 'PAY_STATUS', 'payments', 'status_check', '["transaction", "history"]', 0.85),
('Pay Bills', 'PAY_BILLS', 'payments', 'bill_payment', '["utilities", "services"]', 0.88);

-- Mobility Domain Templates  
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, confidence_score) VALUES
('📍 Share Location', 'MOB_LOC', 'mobility', 'location_share', '["geo", "pickup"]', 0.95),
('Find Driver', 'MOB_DRV', 'mobility', 'find_driver', '["moto", "ride"]', 0.92),
('Find Passengers', 'MOB_PAX', 'mobility', 'find_passengers', '["driver", "pickup"]', 0.90),
('Post Trip', 'MOB_POST', 'mobility', 'create_trip', '["schedule", "route"]', 0.88),
('Driver Signup', 'MOB_SIGNUP', 'mobility', 'driver_onboarding', '["partner", "register"]', 0.85);

-- Commerce/Ordering Domain Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, confidence_score) VALUES
('🍺 Bars', 'ORD_BAR', 'commerce', 'find_bars', '["drinks", "nightlife"]', 0.90),
('💊 Pharmacies', 'ORD_PHAR', 'commerce', 'find_pharmacy', '["medicine", "health"]', 0.95),
('🔧 Hardware', 'ORD_HW', 'commerce', 'find_hardware', '["tools", "supplies"]', 0.88),
('🌾 Farmers', 'ORD_FARM', 'commerce', 'find_farmers', '["produce", "fresh"]', 0.85),
('Register Business', 'ORD_BIZ_REG', 'commerce', 'business_onboarding', '["partner", "merchant"]', 0.82);

-- Listings Domain Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, confidence_score) VALUES
('🏠 List Property', 'LST_PROP', 'listings', 'create_property_listing', '["rent", "sale", "house"]', 0.90),
('🔍 Find Property', 'LST_PROP_FIND', 'listings', 'search_property', '["rent", "buy", "apartment"]', 0.92),
('🚗 List Vehicle', 'LST_VEH', 'listings', 'create_vehicle_listing', '["car", "moto", "sell"]', 0.88),
('🔍 Find Vehicle', 'LST_VEH_FIND', 'listings', 'search_vehicle', '["buy", "rent", "transport"]', 0.90);

-- Support & General Templates
INSERT INTO whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, confidence_score) VALUES
('💬 Talk to Human', 'SUP_HUMAN', 'support', 'escalate', '["help", "agent"]', 0.95),
('📋 Help Menu', 'SUP_MENU', 'support', 'show_help', '["guidance", "options"]', 0.90),
('🌍 Change Language', 'SUP_LANG', 'support', 'change_language', '["kinyarwanda", "english"]', 0.85),
('📊 My Account', 'SUP_ACCOUNT', 'support', 'account_info', '["profile", "settings"]', 0.88);
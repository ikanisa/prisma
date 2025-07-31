-- Create table for storing WhatsApp action buttons that agents can dynamically use
CREATE TABLE public.whatsapp_action_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  button_text TEXT NOT NULL,
  payload TEXT NOT NULL,
  button_type TEXT NOT NULL DEFAULT 'reply' CHECK (button_type IN ('reply', 'url', 'phone_number')),
  url TEXT NULL,
  phone_number TEXT NULL,
  domain TEXT NOT NULL, -- payment, moto, commerce, etc
  intent TEXT NOT NULL, -- specific intent within domain
  context_tags TEXT[] DEFAULT '{}', -- contextual tags for when to show this button
  priority INTEGER DEFAULT 1, -- higher priority buttons shown first
  usage_count INTEGER DEFAULT 0, -- track how often this button is used
  success_rate DECIMAL DEFAULT 0, -- track conversion rate
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'agent_learning',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE NULL,
  user_feedback_score DECIMAL DEFAULT 0 -- user satisfaction with this button
);

-- Enable RLS
ALTER TABLE public.whatsapp_action_buttons ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "System can manage action buttons" 
ON public.whatsapp_action_buttons 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_whatsapp_action_buttons_domain_intent ON public.whatsapp_action_buttons(domain, intent);
CREATE INDEX idx_whatsapp_action_buttons_context_tags ON public.whatsapp_action_buttons USING GIN(context_tags);
CREATE INDEX idx_whatsapp_action_buttons_priority ON public.whatsapp_action_buttons(priority DESC);
CREATE INDEX idx_whatsapp_action_buttons_active ON public.whatsapp_action_buttons(is_active) WHERE is_active = true;

-- Create function to update usage statistics
CREATE OR REPLACE FUNCTION public.update_button_usage(button_id UUID, success BOOLEAN DEFAULT true)
RETURNS void AS $$
BEGIN
  UPDATE public.whatsapp_action_buttons 
  SET 
    usage_count = usage_count + 1,
    last_used_at = now(),
    success_rate = CASE 
      WHEN usage_count = 0 THEN CASE WHEN success THEN 1.0 ELSE 0.0 END
      ELSE (success_rate * usage_count + CASE WHEN success THEN 1.0 ELSE 0.0 END) / (usage_count + 1)
    END,
    updated_at = now()
  WHERE id = button_id;
END;
$$ LANGUAGE plpgsql;

-- Insert initial action buttons for all services
INSERT INTO public.whatsapp_action_buttons (button_text, payload, domain, intent, context_tags, priority) VALUES
-- Welcome/Main buttons
('💸 Pay', 'PAY', 'welcome', 'main_menu', '{"welcome", "new_user"}', 10),
('💰 Get Paid', 'GET_PAID', 'welcome', 'main_menu', '{"welcome", "payment"}', 10),
('🏍️ Find Driver', 'FIND_DRIVER', 'welcome', 'main_menu', '{"welcome", "transport"}', 9),
('🚗 I am Driver', 'DRIVER_ON', 'welcome', 'main_menu', '{"welcome", "driver"}', 9),
('🏪 Browse Shops', 'BROWSE_SHOPS', 'welcome', 'main_menu', '{"welcome", "shopping"}', 8),
('🏠 Properties', 'PROPERTIES', 'welcome', 'main_menu', '{"welcome", "listings"}', 7),
('❓ Help', 'HELP', 'welcome', 'main_menu', '{"welcome", "support"}', 6),

-- Payment buttons
('📱 Scan QR', 'SCAN_QR', 'payment', 'pay_someone', '{"payment", "qr"}', 10),
('🔗 Get My QR', 'GET_QR', 'payment', 'receive_money', '{"payment", "qr"}', 10),
('📞 Send via Phone', 'SEND_PHONE', 'payment', 'send_money', '{"payment", "phone"}', 9),
('💳 Pay Bill', 'PAY_BILL', 'payment', 'bill_payment', '{"payment", "utility"}', 8),
('📊 My Transactions', 'TRANSACTIONS', 'payment', 'history', '{"payment", "history"}', 7),
('❌ Cancel Payment', 'CANCEL_PAYMENT', 'payment', 'cancel', '{"payment", "cancel"}', 5),

-- Moto/Transport buttons
('📍 Share Location', 'SHARE_LOCATION', 'moto', 'location_request', '{"moto", "location"}', 10),
('🏍️ Book Now', 'BOOK_NOW', 'moto', 'book_ride', '{"moto", "booking"}', 9),
('⏰ Schedule Later', 'SCHEDULE_RIDE', 'moto', 'schedule', '{"moto", "future"}', 8),
('💰 See Price', 'CHECK_FARE', 'moto', 'fare_estimate', '{"moto", "pricing"}', 8),
('🗺️ My Trips', 'MY_TRIPS', 'moto', 'trip_history', '{"moto", "history"}', 7),
('🏍️ Go Online', 'DRIVER_ONLINE', 'moto', 'driver_available', '{"driver", "online"}', 9),
('🚫 Go Offline', 'DRIVER_OFFLINE', 'moto', 'driver_unavailable', '{"driver", "offline"}', 8),
('✅ Trip Done', 'TRIP_COMPLETED', 'moto', 'complete_trip', '{"driver", "complete"}', 9),

-- Commerce buttons
('🍺 Bars & Restaurants', 'BARS', 'commerce', 'bars', '{"commerce", "food"}', 9),
('💊 Pharmacy', 'PHARMACY', 'commerce', 'pharmacy', '{"commerce", "health"}', 9),
('🔨 Hardware', 'HARDWARE', 'commerce', 'hardware', '{"commerce", "tools"}', 8),
('💄 Cosmetics', 'COSMETICS', 'commerce', 'cosmetics', '{"commerce", "beauty"}', 8),
('🌱 Fresh Produce', 'FARMERS', 'commerce', 'farmers', '{"commerce", "food", "fresh"}', 8),
('⚙️ Spare Parts', 'SPARE_PARTS', 'commerce', 'spare_parts', '{"commerce", "auto"}', 7),
('🛒 My Cart', 'VIEW_CART', 'commerce', 'cart', '{"commerce", "cart"}', 7),
('📞 Call Shop', 'CALL_SHOP', 'commerce', 'contact_vendor', '{"commerce", "contact"}', 6),

-- Listings buttons
('🏠 Rent House', 'RENT_HOUSE', 'listings', 'rent_property', '{"listings", "rent"}', 9),
('🏠 Buy House', 'BUY_HOUSE', 'listings', 'buy_property', '{"listings", "buy"}', 9),
('🚗 Rent Car', 'RENT_CAR', 'listings', 'rent_vehicle', '{"listings", "vehicle"}', 8),
('📝 List Property', 'LIST_PROPERTY', 'listings', 'create_listing', '{"listings", "sell"}', 8),
('📞 Contact Owner', 'CONTACT_OWNER', 'listings', 'contact_owner', '{"listings", "contact"}', 7),
('💰 Check Price', 'CHECK_PRICE', 'listings', 'price_inquiry', '{"listings", "price"}', 7),
('📋 Property Details', 'PROPERTY_DETAILS', 'listings', 'view_details', '{"listings", "details"}', 6),

-- Support buttons
('💳 Payment Help', 'PAYMENT_HELP', 'support', 'payment_support', '{"support", "payment"}', 9),
('🏍️ Trip Help', 'TRIP_HELP', 'support', 'transport_support', '{"support", "transport"}', 9),
('🛒 Order Help', 'ORDER_HELP', 'support', 'order_support', '{"support", "commerce"}', 8),
('👤 Talk to Human', 'HUMAN_AGENT', 'support', 'human_handoff', '{"support", "escalate"}', 7),
('⭐ Give Feedback', 'FEEDBACK', 'support', 'feedback', '{"support", "feedback"}', 6),
('📱 App Help', 'APP_HELP', 'support', 'app_support', '{"support", "technical"}', 6),

-- Language buttons
('🇷🇼 Kinyarwanda', 'LANG_RW', 'language', 'switch_language', '{"language", "kinyarwanda"}', 5),
('🇫🇷 Français', 'LANG_FR', 'language', 'switch_language', '{"language", "french"}', 5),
('🇺🇸 English', 'LANG_EN', 'language', 'switch_language', '{"language", "english"}', 5),

-- Confirmation buttons
('✅ Yes', 'YES', 'confirmation', 'confirm', '{"confirmation", "positive"}', 8),
('❌ No', 'NO', 'confirmation', 'deny', '{"confirmation", "negative"}', 8),
('🔄 Try Again', 'RETRY', 'error', 'retry', '{"error", "retry"}', 7),
('🏠 Main Menu', 'MAIN_MENU', 'navigation', 'home', '{"navigation", "home"}', 6),
('⬅️ Back', 'BACK', 'navigation', 'previous', '{"navigation", "back"}', 6);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_action_buttons_updated_at
BEFORE UPDATE ON public.whatsapp_action_buttons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
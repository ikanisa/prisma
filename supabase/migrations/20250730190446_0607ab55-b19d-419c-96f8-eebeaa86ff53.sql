-- Add WhatsApp message templates for easyMO agent learning
INSERT INTO whatsapp_templates (id, name, category, language, status, body_text, footer_text, header_type, header_content, created_at) VALUES
('tpl-welcome-001', 'Welcome Message', 'greeting', 'en', 'APPROVED', 'Welcome to easyMO! 🇷🇼 Your WhatsApp super-app for payments, transport, and shopping. How can I help you today?', 'Powered by easyMO', 'TEXT', 'Welcome to easyMO', now()),
('tpl-payment-qr-001', 'Payment QR Generation', 'payments', 'en', 'APPROVED', 'Here''s your payment QR code for {{amount}} RWF. Share this with anyone who needs to pay you, or they can scan it directly.', 'Scan to pay instantly', 'TEXT', 'Payment QR Code', now()),
('tpl-ride-request-001', 'Ride Request Confirmation', 'transport', 'en', 'APPROVED', 'Your ride request from {{pickup}} to {{destination}} has been received. Finding drivers nearby...', 'We''ll connect you soon', 'TEXT', 'Ride Request', now()),
('tpl-driver-found-001', 'Driver Found', 'transport', 'en', 'APPROVED', 'Great news! {{driver_name}} is available for your trip. Vehicle: {{vehicle_details}}. Contact: {{phone}}', 'Tap to confirm booking', 'TEXT', 'Driver Available', now()),
('tpl-business-discovery-001', 'Business Discovery', 'business', 'en', 'APPROVED', 'Found {{count}} {{business_type}} businesses near you: {{business_list}}. Which one would you like to know more about?', 'Discover local businesses', 'TEXT', 'Local Businesses', now()),
('tpl-order-confirmation-001', 'Order Confirmation', 'commerce', 'en', 'APPROVED', 'Order confirmed! {{order_details}}. Total: {{total}} RWF. Estimated delivery: {{delivery_time}}', 'Track your order anytime', 'TEXT', 'Order Confirmed', now()),
('tpl-payment-success-001', 'Payment Success', 'payments', 'en', 'APPROVED', 'Payment successful! {{amount}} RWF sent to {{recipient}}. Transaction ID: {{transaction_id}}', 'Keep this for your records', 'TEXT', 'Payment Complete', now()),
('tpl-support-escalation-001', 'Support Escalation', 'support', 'en', 'APPROVED', 'I''ve escalated your issue to our support team. Reference: {{ticket_id}}. They''ll contact you within 30 minutes.', 'We''re here to help', 'TEXT', 'Support Request', now()),
('tpl-event-reminder-001', 'Event Reminder', 'events', 'en', 'APPROVED', 'Reminder: {{event_name}} starts in {{time_remaining}}. Location: {{location}}. See you there!', 'Don''t miss out', 'TEXT', 'Event Reminder', now()),
('tpl-promo-offer-001', 'Promotional Offer', 'marketing', 'en', 'APPROVED', 'Special offer! {{discount}}% off {{service_type}} today only. Use code: {{promo_code}}', 'Limited time offer', 'TEXT', 'Special Deal', now()),
('tpl-trip-completed-001', 'Trip Completed', 'transport', 'en', 'APPROVED', 'Trip completed! Thanks for choosing easyMO. Please rate your experience with {{driver_name}}.', 'Safe travels always', 'TEXT', 'Trip Complete', now()),
('tpl-low-balance-001', 'Low Balance Alert', 'payments', 'en', 'APPROVED', 'Your MoMo balance is running low ({{balance}} RWF). Top up now to continue enjoying easyMO services.', 'Stay connected', 'TEXT', 'Balance Alert', now())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  body_text = EXCLUDED.body_text,
  status = EXCLUDED.status;
-- Add pharmacy-specific WhatsApp templates using 'support' category (closest allowed)
INSERT INTO public.whatsapp_templates (name, category, content, variables, status) VALUES
('Pharma_Order_Confirm', 'support', 
'✅ Order Confirmed #{{order_id}}

🏥 {{pharmacy_name}}
📦 Items: {{item_count}}
💰 Total: {{total_amount}} RWF
🚚 Delivery: {{delivery_fee}} RWF

📍 Delivery to: {{delivery_address}}
⏰ ETA: {{delivery_eta}}

💳 Payment: {{payment_status}}
🆔 Reference: {{payment_ref}}

📞 Questions? Reply HELP
🚫 Cancel? Reply STOP within 5min

Thank you for choosing easyMO Pharmacy! 🩺', 
ARRAY['order_id', 'pharmacy_name', 'item_count', 'total_amount', 'delivery_fee', 'delivery_address', 'delivery_eta', 'payment_status', 'payment_ref'], 
'approved'),

('Pharma_Payment_Request', 'payment',
'💊 Ready to pay for your order?

🛒 Order #{{order_id}}
📦 {{item_list}}
💰 Subtotal: {{subtotal}} RWF
🚚 Delivery: {{delivery_fee}} RWF
📊 Total: {{total_amount}} RWF

💳 Pay with MoMo:
{{momo_ussd_code}}

Or scan QR:
{{qr_code_url}}

⏰ Complete payment in 10 minutes
❓ Need help? Reply HELP', 
ARRAY['order_id', 'item_list', 'subtotal', 'delivery_fee', 'total_amount', 'momo_ussd_code', 'qr_code_url'],
'approved'),

('Pharma_Courier_Assigned', 'ride',
'🛵 Your medication is on the way!

📦 Order #{{order_id}}
👨‍⚕️ Courier: {{courier_name}}
📱 Phone: {{courier_phone}}
🕒 ETA: {{estimated_arrival}}

📍 Tracking: {{tracking_url}}
🔢 Delivery code: {{delivery_code}}

Show this code to the courier when they arrive.

Updates: {{status_updates}}', 
ARRAY['order_id', 'courier_name', 'courier_phone', 'estimated_arrival', 'tracking_url', 'delivery_code', 'status_updates'],
'approved'),

('Pharma_Prescription_OCR_Failed', 'support',
'📋 Prescription Image Issue

❌ Could not read your prescription clearly.

Please send a clearer photo:
📸 Good lighting
📐 Straight angle  
🔍 Full prescription visible
✍️ Clear handwriting

Or type medication names manually.

Reply HELP for assistance 🩺', 
ARRAY[]::text[],
'approved');
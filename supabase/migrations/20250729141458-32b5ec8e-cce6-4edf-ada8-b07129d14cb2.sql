-- Insert feedback templates with correct status value
INSERT INTO whatsapp_templates (
  code, 
  name_meta, 
  body, 
  category, 
  domain, 
  intent, 
  language, 
  buttons, 
  status
) VALUES 
(
  'thumbs_feedback', 
  'Thumbs Feedback Template', 
  'How was your experience with easyMO? Please let us know! 👍👎', 
  'utility', 
  'easymo', 
  'feedback_collection', 
  'en', 
  '[{"type": "quick_reply", "text": "👍 Good"}, {"type": "quick_reply", "text": "👎 Poor"}]', 
  'PENDING'
),
(
  'service_rating_5star', 
  'Service Rating 5 Star', 
  'Please rate our service (1-5 stars):', 
  'utility', 
  'easymo', 
  'service_rating', 
  'en', 
  '[{"type": "quick_reply", "text": "⭐ 1 Star"}, {"type": "quick_reply", "text": "⭐⭐ 2 Stars"}, {"type": "quick_reply", "text": "⭐⭐⭐ 3 Stars"}, {"type": "quick_reply", "text": "⭐⭐⭐⭐ 4 Stars"}, {"type": "quick_reply", "text": "⭐⭐⭐⭐⭐ 5 Stars"}]', 
  'PENDING'
),
(
  'payment_feedback', 
  'Payment Experience Feedback', 
  'How was your payment experience?', 
  'utility', 
  'easymo', 
  'payment_feedback', 
  'en', 
  '[{"type": "quick_reply", "text": "💚 Smooth"}, {"type": "quick_reply", "text": "⚠️ Issues"}, {"type": "quick_reply", "text": "❌ Failed"}]', 
  'PENDING'
),
(
  'transport_feedback', 
  'Transport Experience Feedback', 
  'How was your ride experience?', 
  'utility', 
  'easymo', 
  'transport_feedback', 
  'en', 
  '[{"type": "quick_reply", "text": "🚗 Excellent"}, {"type": "quick_reply", "text": "👍 Good"}, {"type": "quick_reply", "text": "👎 Poor"}, {"type": "quick_reply", "text": "❌ Bad"}]', 
  'PENDING'
)
ON CONFLICT (code) DO NOTHING;
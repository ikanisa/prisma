-- Create WhatsApp Templates table for template approval workflow
CREATE TABLE public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('ride', 'payment', 'rating', 'support', 'promo', 'emergency')),
  content text NOT NULL,
  variables text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  approved_by uuid,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Admin can manage all templates
CREATE POLICY "Admin can manage whatsapp_templates" 
ON public.whatsapp_templates 
FOR ALL 
USING (is_admin()) 
WITH CHECK (is_admin());

-- System can read approved templates
CREATE POLICY "System can read approved templates" 
ON public.whatsapp_templates 
FOR SELECT 
USING (status = 'approved');

-- Create index for performance
CREATE INDEX idx_whatsapp_templates_status ON public.whatsapp_templates(status);
CREATE INDEX idx_whatsapp_templates_category ON public.whatsapp_templates(category);

-- Insert default templates
INSERT INTO public.whatsapp_templates (name, category, content, variables, status) VALUES
  ('Driver Assigned', 'ride', '🎉 **Driver Found!**\n👨‍🦲 {{driver_name}} ({{vehicle_plate}})\n⭐ {{driver_rating}}/5 stars\n📍 Arriving in {{eta_minutes}} minutes\n\n📍 Track: {{tracking_link}}\n📞 Call: {{driver_phone}}', 
   ARRAY['driver_name', 'vehicle_plate', 'driver_rating', 'eta_minutes', 'tracking_link', 'driver_phone'], 'approved'),
  
  ('Ride Confirmation', 'ride', '🛵 **Ride Confirmed!**\nFrom: {{origin_address}}\nTo: {{destination_address}}\nFare: {{fare_estimate}} RWF\n\n🚗 Looking for nearest driver...\n⏱️ ETA: 2-5 minutes',
   ARRAY['origin_address', 'destination_address', 'fare_estimate'], 'approved'),
  
  ('Payment Request', 'payment', '💰 **Payment Due**\nRide completed! Total fare: {{total_amount}} RWF\n\n💳 **Pay Options:**\n1️⃣ Mobile Money: {{momo_ussd_code}}\n2️⃣ QR Code: Reply QR\n\n💸 Tip driver? Add tip amount (optional)',
   ARRAY['total_amount', 'momo_ussd_code'], 'approved'),
  
  ('Payment Confirmation', 'payment', '✅ **Payment Successful**\nAmount: {{paid_amount}} RWF\nTransaction: {{transaction_id}}\n\n🙏 Thank you for riding with easyMO!\n⭐ Rate your ride: Reply 1-5 stars',
   ARRAY['paid_amount', 'transaction_id'], 'approved'),
  
  ('Rating Request', 'rating', '⭐ **Rate Your Ride**\nHow was your experience with {{driver_name}}?\n\n1️⃣ ⭐ Poor\n2️⃣ ⭐⭐ Fair\n3️⃣ ⭐⭐⭐ Good\n4️⃣ ⭐⭐⭐⭐ Very Good\n5️⃣ ⭐⭐⭐⭐⭐ Excellent\n\n💬 Optional feedback: Type your comment',
   ARRAY['driver_name'], 'approved'),
  
  ('Emergency Alert', 'emergency', '🆘 **Emergency Protocol**\nYour safety is our priority\n\n🚨 Emergency contacts notified\n📍 Location shared with authorities\n📞 Emergency line: 912\n\nStay calm, help is coming.',
   ARRAY[], 'approved'),
  
  ('Promo Code', 'promo', '🎁 **Special Offer!**\nGet 20% off your next 3 rides\n\n🏷️ Code: {{promo_code}}\n⏰ Valid until: {{expiry_date}}\n🛵 Reply RIDE to book now\n\nTerms apply*',
   ARRAY['promo_code', 'expiry_date'], 'approved');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_templates;
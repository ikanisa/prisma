-- Populate agents table with YAML-based agent definitions
INSERT INTO public.agents (name, description, status) VALUES
('OnboardingAgent', 'Handles user onboarding and role selection for shoppers, farmers, and drivers', 'active'),
('PaymentAgent', 'Generates MoMo QR codes and USSD links for payments', 'active'),
('ListingAgent', 'Allows farmers to list their produce using simple text commands', 'active'),
('MarketplaceAgent', 'Connects shoppers with farmer inventory using card UI and cart functionality', 'active'),
('LogisticsAgent', 'Manages driver status and passenger ride requests', 'active'),
('BusinessAgent', 'Enables ordering and payments for bars, pharmacies, and shops', 'active'),
('EventsAgent', 'Shows events and handles booking or user-submitted events', 'active'),
('MarketingAgent', 'Sends WhatsApp template promotions every 6 hours with opt-out support', 'active'),
('SupportAgent', '24/7 support with sentiment-based escalation to human agents', 'active')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status;
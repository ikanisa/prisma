-- Fix RLS security issues by enabling RLS and adding policies for all affected tables

-- Enable RLS on all tables that need it
ALTER TABLE public.agent_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_places_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Add policies for agent_conversations - user specific access
CREATE POLICY "Users can view their own conversations" 
ON public.agent_conversations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own conversations" 
ON public.agent_conversations 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Add policies for support_tickets - user specific access
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (user_id = auth.uid());

-- Add policies for subscriptions - user specific access
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Add policies for driver_wallet - driver specific access
CREATE POLICY "Drivers can view their own wallet" 
ON public.driver_wallet 
FOR SELECT 
USING (driver_id IN (
  SELECT id FROM drivers WHERE user_id = auth.uid()
));

CREATE POLICY "System can manage driver wallets" 
ON public.driver_wallet 
FOR ALL 
USING (is_admin());

-- Add policies for referrals - basic access control
CREATE POLICY "Users can view referrals they're involved in" 
ON public.referrals 
FOR SELECT 
USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can create referrals as referrer" 
ON public.referrals 
FOR INSERT 
WITH CHECK (referrer_user_id = auth.uid());

-- Add policies for user_contacts - admin only for now
CREATE POLICY "Admin can manage user contacts" 
ON public.user_contacts 
FOR ALL 
USING (is_admin());

-- Add policies for google_places_businesses - public read, admin write
CREATE POLICY "Public can view verified businesses" 
ON public.google_places_businesses 
FOR SELECT 
USING (agent_verified = true);

CREATE POLICY "Admin can manage all businesses" 
ON public.google_places_businesses 
FOR ALL 
USING (is_admin());
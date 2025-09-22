-- Enable RLS on tables that need it and add appropriate policies

-- Enable RLS on tables that currently don't have it
ALTER TABLE public.agent_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_places_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Add policies for agent_learning (admin only)
CREATE POLICY "Admin full access to agent_learning" ON public.agent_learning 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add policies for driver_wallet (drivers can see their own wallet)
CREATE POLICY "Drivers can view own wallet" ON public.driver_wallet 
FOR SELECT USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "System can update driver wallets" ON public.driver_wallet 
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "System can insert driver wallets" ON public.driver_wallet 
FOR INSERT WITH CHECK (true);

-- Add policies for user_contacts (system access only for now)
CREATE POLICY "System access to user_contacts" ON public.user_contacts 
FOR ALL USING (true) WITH CHECK (true);

-- Add policies for google_places_businesses (public read, system write)
CREATE POLICY "Public read google_places_businesses" ON public.google_places_businesses 
FOR SELECT USING (true);

CREATE POLICY "System write google_places_businesses" ON public.google_places_businesses 
FOR INSERT WITH CHECK (true);

CREATE POLICY "System update google_places_businesses" ON public.google_places_businesses 
FOR UPDATE USING (true) WITH CHECK (true);

-- Add policies for agent_conversations (users can see their own conversations)
CREATE POLICY "Users can view own conversations" ON public.agent_conversations 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert conversations" ON public.agent_conversations 
FOR INSERT WITH CHECK (true);

-- Add policies for support_tickets (users can see their own tickets)
CREATE POLICY "Users can view own tickets" ON public.support_tickets 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own tickets" ON public.support_tickets 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can view all tickets" ON public.support_tickets 
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add policies for subscriptions (users can see their own subscriptions)
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage subscriptions" ON public.subscriptions 
FOR ALL USING (true) WITH CHECK (true);

-- Add policies for referrals (users can see referrals they made or received)
CREATE POLICY "Users can view own referrals" ON public.referrals 
FOR SELECT USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "System can create referrals" ON public.referrals 
FOR INSERT WITH CHECK (true);
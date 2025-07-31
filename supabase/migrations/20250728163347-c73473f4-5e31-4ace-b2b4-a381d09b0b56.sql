-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "System can manage wa_contacts" ON public.wa_contacts;
DROP POLICY IF EXISTS "System can manage incoming_messages" ON public.incoming_messages;

-- Create the missing policies
CREATE POLICY "System can manage wa_contacts" ON public.wa_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "System can manage incoming_messages" ON public.incoming_messages FOR ALL USING (true) WITH CHECK (true);
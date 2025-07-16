-- Temporarily allow public read access to agent_documents for admin panel
-- We'll add a public read policy for the admin panel
CREATE POLICY "Admin panel read access" ON public.agent_documents 
FOR SELECT 
USING (true);
-- Ensure incoming_messages table has proper RLS policies for edge function access
ALTER TABLE incoming_messages ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to insert messages using service role
CREATE POLICY "Allow edge function inserts" 
ON incoming_messages 
FOR INSERT 
WITH CHECK (true);

-- Allow system to read all messages
CREATE POLICY "System can read all messages" 
ON incoming_messages 
FOR SELECT 
USING (true);
-- Create storage bucket for persona documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('persona-docs', 'persona-docs', true);

-- Create policies for persona documents storage
CREATE POLICY "Anyone can view persona documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'persona-docs');

CREATE POLICY "Authenticated users can upload persona documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'persona-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update persona documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'persona-docs' AND auth.role() = 'authenticated');
-- Create storage bucket for agent documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', false);

-- Create policies for the uploads bucket
CREATE POLICY "Authenticated users can upload files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Admin users can view all files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'uploads' AND is_admin());

CREATE POLICY "Admin users can delete files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'uploads' AND is_admin());
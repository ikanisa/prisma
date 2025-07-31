-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true);

-- Create storage policies for QR codes bucket
CREATE POLICY "QR codes are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'qr-codes');

CREATE POLICY "System can upload QR codes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'qr-codes');

CREATE POLICY "System can update QR codes" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'qr-codes');

CREATE POLICY "System can delete QR codes" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'qr-codes');
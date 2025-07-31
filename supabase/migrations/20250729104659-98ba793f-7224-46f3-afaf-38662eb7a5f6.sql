-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for QR codes - allow public access
CREATE POLICY "QR codes are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'qr-codes');

-- Allow uploads to QR bucket (for edge functions)
CREATE POLICY "Allow QR code uploads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'qr-codes');
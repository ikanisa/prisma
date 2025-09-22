
-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for QR codes bucket
CREATE POLICY "Anyone can view QR codes" ON storage.objects
FOR SELECT USING (bucket_id = 'qr-codes');

CREATE POLICY "Authenticated users can upload QR codes" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'qr-codes');

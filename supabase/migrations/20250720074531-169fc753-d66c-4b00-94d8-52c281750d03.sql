-- Create QR codes storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Create helper function for folder path parsing
CREATE OR REPLACE FUNCTION storage.foldername(p text)
RETURNS text[] 
LANGUAGE sql 
IMMUTABLE AS
$$ SELECT string_to_array(p, '/') $$;

-- Allow authenticated users to upload into their own folder
CREATE POLICY "owner-write" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'qr-codes'
  AND (storage.foldername(name))[1] = COALESCE(
    current_setting('request.jwt.claims', true)::json->>'phone',
    current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Allow public reads since bucket is public
CREATE POLICY "public-read" ON storage.objects
FOR SELECT USING (bucket_id = 'qr-codes');
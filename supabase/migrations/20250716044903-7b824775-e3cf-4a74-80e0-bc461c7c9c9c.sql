-- Create public storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true);

-- Create storage policies for the public bucket
CREATE POLICY "Public bucket read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'public');

CREATE POLICY "Authenticated users can upload to public bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'public' AND auth.role() = 'authenticated');

CREATE POLICY "Service role can manage public bucket" ON storage.objects
  FOR ALL USING (bucket_id = 'public' AND auth.role() = 'service_role');

-- Create helper function for finding nearby drivers
CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  pickup_point geography,
  max_km double precision
)
RETURNS TABLE(id uuid, distance_km double precision) 
LANGUAGE sql AS $$
  SELECT id,
         ST_Distance(location_gps, pickup_point)/1000 as distance_km
  FROM drivers
  WHERE is_online = true
  AND ST_DWithin(location_gps, pickup_point, max_km*1000)
  ORDER BY distance_km ASC
  LIMIT 1;
$$;
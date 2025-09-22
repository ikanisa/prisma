-- Extract contact information from pos_system_config to dedicated columns
UPDATE public.businesses 
SET 
  phone_number = COALESCE(phone_number, pos_system_config->>'phone'),
  address = COALESCE(address, pos_system_config->>'address'),
  rating = COALESCE(NULLIF(rating, 0), (pos_system_config->>'rating')::numeric, 0),
  reviews_count = COALESCE(NULLIF(reviews_count, 0), (pos_system_config->>'user_ratings_total')::integer, 0),
  website = COALESCE(website, pos_system_config->>'website'),
  google_place_id = COALESCE(google_place_id, pos_system_config->>'google_places_id'),
  whatsapp_number = COALESCE(whatsapp_number, pos_system_config->>'phone')
WHERE pos_system_config IS NOT NULL;
-- Update businesses table to ensure all phone numbers from pos_system_config are populated
UPDATE public.businesses 
SET 
  phone_number = COALESCE(phone_number, pos_system_config->>'phone'),
  whatsapp_number = COALESCE(whatsapp_number, pos_system_config->>'phone')
WHERE pos_system_config IS NOT NULL 
  AND pos_system_config->>'phone' IS NOT NULL
  AND (phone_number IS NULL OR whatsapp_number IS NULL);
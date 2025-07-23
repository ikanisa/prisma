-- Add missing business types to the enum
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'hardware';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'salon';
ALTER TYPE public.business_type ADD VALUE IF NOT EXISTS 'cosmetics';

-- Fix incorrectly categorized businesses
-- Fix pharmacies that were saved as 'store'
UPDATE public.businesses 
SET category = 'pharmacy'
WHERE category = 'store' 
AND (
  name ILIKE '%pharmac%' OR 
  name ILIKE '%drugstore%' OR 
  name ILIKE '%drug%' OR
  pos_system_config->>'types' ILIKE '%pharmacy%' OR
  pos_system_config->>'types' ILIKE '%drugstore%'
);

-- Fix hardware shops
UPDATE public.businesses 
SET category = 'hardware'
WHERE category = 'store' 
AND (
  name ILIKE '%hardware%' OR 
  name ILIKE '%quincaillerie%' OR 
  name ILIKE '%tool%' OR
  name ILIKE '%construction%' OR
  name ILIKE '%building%'
);

-- Fix salons
UPDATE public.businesses 
SET category = 'salon'
WHERE category = 'store' 
AND (
  name ILIKE '%salon%' OR 
  name ILIKE '%hair%' OR 
  name ILIKE '%barber%' OR
  name ILIKE '%beauty%' OR
  name ILIKE '%coiffure%'
);

-- Fix cosmetics stores
UPDATE public.businesses 
SET category = 'cosmetics'
WHERE category = 'store' 
AND (
  name ILIKE '%cosmetic%' OR 
  name ILIKE '%beauty%' OR 
  name ILIKE '%makeup%' OR
  name ILIKE '%perfum%'
);

-- Fix restaurants and bars
UPDATE public.businesses 
SET category = 'restaurant'
WHERE category = 'store' 
AND (
  name ILIKE '%restaurant%' OR 
  name ILIKE '%cafe%' OR 
  name ILIKE '%food%' OR 
  name ILIKE '%dining%' OR
  pos_system_config->>'types' ILIKE '%restaurant%' OR
  pos_system_config->>'types' ILIKE '%food%'
);

UPDATE public.businesses 
SET category = 'bar'
WHERE category = 'store' 
AND (
  name ILIKE '%bar%' OR 
  name ILIKE '%pub%' OR 
  name ILIKE '%club%' OR 
  name ILIKE '%tavern%' OR
  pos_system_config->>'types' ILIKE '%night_club%' OR
  pos_system_config->>'types' ILIKE '%bar%'
);

-- Create index for better performance on category searches
CREATE INDEX IF NOT EXISTS idx_businesses_category_name ON businesses(category, name);

-- Log the fix execution
INSERT INTO agent_execution_log (function_name, success_status, input_data, execution_time_ms)
VALUES ('fix_business_categories_and_add_types', true, '{"action": "fix_categories_add_types"}', 100);
-- Fix businesses with wrong categories - many were mapped to 'shop' instead of 'pharmacy'
-- Update categories based on business names and metadata

-- First, backup the current state
CREATE TABLE IF NOT EXISTS businesses_backup AS TABLE businesses;

-- Update pharmacies that were incorrectly categorized as 'shop'
UPDATE businesses 
SET category = 'pharmacy'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%pharmac%' OR 
  LOWER(name) LIKE '%drugstore%' OR 
  LOWER(name) LIKE '%medical%' OR
  pos_system_config->>'types' LIKE '%pharmacy%' OR
  pos_system_config->>'types' LIKE '%drugstore%' OR
  pos_system_config->>'types' LIKE '%health%'
);

-- Update restaurants that were incorrectly categorized
UPDATE businesses 
SET category = 'restaurant'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%restaurant%' OR 
  LOWER(name) LIKE '%cafe%' OR 
  LOWER(name) LIKE '%eatery%' OR
  pos_system_config->>'types' LIKE '%restaurant%' OR
  pos_system_config->>'types' LIKE '%food%' OR
  pos_system_config->>'types' LIKE '%meal%'
);

-- Update hotels that were incorrectly categorized  
UPDATE businesses 
SET category = 'hotel'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%hotel%' OR 
  LOWER(name) LIKE '%lodge%' OR 
  LOWER(name) LIKE '%guest%' OR
  pos_system_config->>'types' LIKE '%hotel%' OR
  pos_system_config->>'types' LIKE '%lodging%' OR
  pos_system_config->>'types' LIKE '%accommodation%'
);

-- Update gas stations that were incorrectly categorized
UPDATE businesses 
SET category = 'gas_station'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%gas%' OR 
  LOWER(name) LIKE '%petrol%' OR 
  LOWER(name) LIKE '%fuel%' OR
  pos_system_config->>'types' LIKE '%gas_station%' OR
  pos_system_config->>'types' LIKE '%gas%'
);

-- Update banks that were incorrectly categorized
UPDATE businesses 
SET category = 'bank'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%bank%' OR 
  LOWER(name) LIKE '%atm%' OR 
  LOWER(name) LIKE '%financial%' OR
  pos_system_config->>'types' LIKE '%bank%' OR
  pos_system_config->>'types' LIKE '%atm%' OR
  pos_system_config->>'types' LIKE '%finance%'
);

-- Update schools that were incorrectly categorized
UPDATE businesses 
SET category = 'school'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%school%' OR 
  LOWER(name) LIKE '%college%' OR 
  LOWER(name) LIKE '%university%' OR
  pos_system_config->>'types' LIKE '%school%' OR
  pos_system_config->>'types' LIKE '%university%' OR
  pos_system_config->>'types' LIKE '%education%'
);

-- Update hospitals that were incorrectly categorized
UPDATE businesses 
SET category = 'hospital'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%hospital%' OR 
  LOWER(name) LIKE '%clinic%' OR 
  LOWER(name) LIKE '%medical%center%' OR
  pos_system_config->>'types' LIKE '%hospital%' OR
  pos_system_config->>'types' LIKE '%clinic%' OR
  pos_system_config->>'types' LIKE '%doctor%'
);

-- Update bars that were incorrectly categorized
UPDATE businesses 
SET category = 'bar'
WHERE category = 'shop' 
AND (
  LOWER(name) LIKE '%bar%' OR 
  LOWER(name) LIKE '%pub%' OR 
  LOWER(name) LIKE '%tavern%' OR
  pos_system_config->>'types' LIKE '%bar%' OR
  pos_system_config->>'types' LIKE '%night_club%' OR
  pos_system_config->>'types' LIKE '%liquor%'
);

-- For stores, keep them as 'store' if they have generic store types
UPDATE businesses 
SET category = 'store'
WHERE category = 'shop' 
AND (
  pos_system_config->>'types' LIKE '%store%' OR
  pos_system_config->>'types' LIKE '%shopping%' OR
  pos_system_config->>'types' LIKE '%retail%'
);

-- Add indexes for better performance on category searches
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_name_search ON businesses USING gin(to_tsvector('english', name));

-- Log the category updates
INSERT INTO agent_execution_log (
  function_name, 
  input_data, 
  success_status, 
  execution_time_ms,
  model_used
) VALUES (
  'fix_business_categories',
  '{"action": "category_correction", "description": "Fixed incorrect business categories that were all mapped to shop"}',
  true,
  1000,
  'database-migration'
);
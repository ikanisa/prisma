-- Data Migration: Copy existing data into unified tables (corrected)
-- This migration safely migrates data from old domain-specific tables to unified tables

-- First, migrate products to unified_listings
INSERT INTO public.unified_listings (
  id,
  type,
  title,
  description,
  price,
  owner_id,
  metadata,
  location_gps,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'product'::listing_type as type,
  name as title,
  description,
  price,
  business_id as owner_id,
  COALESCE(jsonb_build_object(
    'category', category,
    'stock_quantity', stock_quantity,
    'unit', unit,
    'brand', brand,
    'model', model,
    'specifications', specifications
  ), '{}'::jsonb) as metadata,
  location_gps,
  COALESCE(status::listing_status, 'active'::listing_status),
  created_at,
  updated_at
FROM public.products
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_listings ul 
  WHERE ul.id = products.id
);

-- Migrate produce to unified_listings  
INSERT INTO public.unified_listings (
  id,
  type,
  title,
  description,
  price,
  owner_id,
  metadata,
  location_gps,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'produce'::listing_type as type,
  name as title,
  description,
  price_per_unit as price,
  farmer_id as owner_id,
  COALESCE(jsonb_build_object(
    'category', category,
    'quantity_available', quantity_available,
    'unit_type', unit_type,
    'harvest_date', harvest_date,
    'organic', organic,
    'quality_grade', quality_grade
  ), '{}'::jsonb) as metadata,
  location_gps,
  COALESCE(status::listing_status, 'active'::listing_status),
  created_at,
  updated_at
FROM public.produce
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_listings ul 
  WHERE ul.id = produce.id
);

-- Create indexes for better performance on unified tables
CREATE INDEX IF NOT EXISTS idx_unified_listings_owner_type ON public.unified_listings (owner_id, type);
CREATE INDEX IF NOT EXISTS idx_unified_listings_status_type ON public.unified_listings (status, type);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_channel ON public.conversations (contact_id, channel);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);

-- Update table statistics for better query planning
ANALYZE public.unified_listings;
ANALYZE public.unified_orders;
ANALYZE public.conversations;
ANALYZE public.messages;
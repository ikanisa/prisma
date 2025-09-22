-- Data Migration: Copy existing data into unified tables
-- This migration safely migrates data from old domain-specific tables to unified tables

-- First, migrate products to unified_listings
INSERT INTO public.unified_listings (
  id,
  listing_type,
  title,
  description,
  price,
  vendor_id,
  metadata,
  location_gps,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'product' as listing_type,
  name as title,
  description,
  price,
  business_id as vendor_id,
  jsonb_build_object(
    'category', category,
    'stock_quantity', stock_quantity,
    'unit', unit,
    'brand', brand,
    'model', model,
    'specifications', specifications
  ) as metadata,
  location_gps,
  status,
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
  listing_type,
  title,
  description,
  price,
  vendor_id,
  metadata,
  location_gps,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'produce' as listing_type,
  name as title,
  description,
  price_per_unit as price,
  farmer_id as vendor_id,
  jsonb_build_object(
    'category', category,
    'quantity_available', quantity_available,
    'unit_type', unit_type,
    'harvest_date', harvest_date,
    'organic', organic,
    'quality_grade', quality_grade
  ) as metadata,
  location_gps,
  status,
  created_at,
  updated_at
FROM public.produce
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_listings ul 
  WHERE ul.id = produce.id
);

-- Migrate properties to unified_listings
INSERT INTO public.unified_listings (
  id,
  listing_type,
  title,
  description,
  price,
  vendor_id,
  metadata,
  location_gps,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'property' as listing_type,
  title,
  description,
  price,
  owner_id as vendor_id,
  jsonb_build_object(
    'property_type', property_type,
    'bedrooms', bedrooms,
    'bathrooms', bathrooms,
    'size_sqm', size_sqm,
    'amenities', amenities,
    'listing_type', listing_type
  ) as metadata,
  location_gps,
  status,
  created_at,
  updated_at
FROM public.properties
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_listings ul 
  WHERE ul.id = properties.id
);

-- Migrate vehicles to unified_listings
INSERT INTO public.unified_listings (
  id,
  listing_type,
  title,
  description,
  price,
  vendor_id,
  metadata,
  location_gps,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'vehicle' as listing_type,
  CONCAT(make, ' ', model, ' ', year) as title,
  description,
  price,
  owner_id as vendor_id,
  jsonb_build_object(
    'make', make,
    'model', model,
    'year', year,
    'mileage', mileage,
    'fuel_type', fuel_type,
    'transmission', transmission,
    'condition', condition,
    'vehicle_type', vehicle_type
  ) as metadata,
  location_gps,
  status,
  created_at,
  updated_at
FROM public.vehicles
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_listings ul 
  WHERE ul.id = vehicles.id
);

-- Migrate pharmacy_products to unified_listings
INSERT INTO public.unified_listings (
  id,
  listing_type,
  title,
  description,
  price,
  vendor_id,
  metadata,
  location_gps,
  status,
  created_at,
  updated_at
)
SELECT 
  id,
  'pharmacy_product' as listing_type,
  name as title,
  description,
  price,
  pharmacy_id as vendor_id,
  jsonb_build_object(
    'category', category,
    'dosage', dosage,
    'manufacturer', manufacturer,
    'requires_prescription', requires_prescription,
    'stock_quantity', stock_quantity,
    'expiry_date', expiry_date
  ) as metadata,
  NULL as location_gps, -- Most pharmacy products don't have specific GPS
  status,
  created_at,
  updated_at
FROM public.pharmacy_products
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_listings ul 
  WHERE ul.id = pharmacy_products.id
);

-- Migrate existing orders to unified_orders
INSERT INTO public.unified_orders (
  id,
  user_id,
  vendor_id,
  listing_id,
  order_type,
  status,
  total_amount,
  currency,
  domain_metadata,
  created_at,
  updated_at
)
SELECT 
  id,
  customer_id as user_id,
  business_id as vendor_id,
  product_id as listing_id,
  'product' as order_type,
  status,
  total_amount,
  'RWF' as currency,
  jsonb_build_object(
    'quantity', quantity,
    'unit_price', unit_price,
    'delivery_address', delivery_address,
    'delivery_date', delivery_date,
    'payment_method', payment_method
  ) as domain_metadata,
  created_at,
  updated_at
FROM public.orders
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_orders uo 
  WHERE uo.id = orders.id
);

-- Migrate pharmacy_orders to unified_orders
INSERT INTO public.unified_orders (
  id,
  user_id,
  vendor_id,
  listing_id,
  order_type,
  status,
  total_amount,
  currency,
  domain_metadata,
  created_at,
  updated_at
)
SELECT 
  id,
  customer_id as user_id,
  pharmacy_id as vendor_id,
  product_id as listing_id,
  'pharmacy' as order_type,
  status,
  total_amount,
  'RWF' as currency,
  jsonb_build_object(
    'quantity', quantity,
    'prescription_required', prescription_required,
    'prescription_url', prescription_url,
    'delivery_address', delivery_address
  ) as domain_metadata,
  created_at,
  updated_at
FROM public.pharmacy_orders
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_orders uo 
  WHERE uo.id = pharmacy_orders.id
);

-- Migrate whatsapp_messages to conversations and messages tables
-- First create conversations from unique phone numbers
INSERT INTO public.conversations (
  id,
  contact_id,
  channel,
  thread_id,
  status,
  started_at
)
SELECT 
  gen_random_uuid() as id,
  phone_number as contact_id,
  'whatsapp' as channel,
  NULL as thread_id,
  'active' as status,
  MIN(created_at) as started_at
FROM public.conversation_messages
WHERE phone_number IS NOT NULL
GROUP BY phone_number
ON CONFLICT DO NOTHING;

-- Now migrate messages
INSERT INTO public.messages (
  id,
  conversation_id,
  sender_type,
  content,
  metadata,
  created_at
)
SELECT 
  cm.id,
  c.id as conversation_id,
  CASE 
    WHEN cm.sender = 'user' THEN 'user'
    WHEN cm.sender = 'agent' THEN 'agent'
    ELSE 'system'
  END as sender_type,
  cm.message_text as content,
  jsonb_build_object(
    'message_type', cm.message_type,
    'status', cm.status,
    'metadata', cm.metadata,
    'reactions', cm.reactions,
    'reply_to', cm.reply_to,
    'file_url', cm.file_url,
    'file_name', cm.file_name,
    'file_size', cm.file_size
  ) as metadata,
  cm.created_at
FROM public.conversation_messages cm
JOIN public.conversations c ON c.contact_id = cm.phone_number AND c.channel = 'whatsapp'
WHERE NOT EXISTS (
  SELECT 1 FROM public.messages m 
  WHERE m.id = cm.id
);

-- Create indexes for better performance on unified tables
CREATE INDEX IF NOT EXISTS idx_unified_listings_vendor_type ON public.unified_listings (vendor_id, listing_type);
CREATE INDEX IF NOT EXISTS idx_unified_listings_status_type ON public.unified_listings (status, listing_type);
CREATE INDEX IF NOT EXISTS idx_unified_orders_user_type ON public.unified_orders (user_id, order_type);
CREATE INDEX IF NOT EXISTS idx_unified_orders_vendor_type ON public.unified_orders (vendor_id, order_type);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_channel ON public.conversations (contact_id, channel);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);

-- Update table statistics for better query planning
ANALYZE public.unified_listings;
ANALYZE public.unified_orders;
ANALYZE public.conversations;
ANALYZE public.messages;
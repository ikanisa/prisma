-- Simple data seeding for unified tables
-- This adds sample data to demonstrate the unified schema

-- Add sample listings from existing products
INSERT INTO public.unified_listings (
  type,
  title,
  description,
  price,
  owner_id,
  metadata,
  status
)
SELECT 
  'product'::listing_type as type,
  COALESCE(name, 'Sample Product') as title,
  COALESCE(description, 'No description available') as description,
  COALESCE(price::numeric, 0) as price,
  business_id as owner_id,
  jsonb_build_object(
    'category', COALESCE(category, 'general'),
    'stock_quantity', COALESCE(stock_quantity, stock_qty, 0),
    'unit', COALESCE(unit, 'item'),
    'sku', sku,
    'source', 'migrated_from_products'
  ) as metadata,
  'active'::listing_status as status
FROM public.products
WHERE business_id IS NOT NULL
LIMIT 10
ON CONFLICT (id) DO NOTHING;

-- Add sample unified orders
INSERT INTO public.unified_orders (
  user_id,
  quantity,
  price,
  status,
  metadata
)
SELECT 
  user_id,
  1 as quantity,
  COALESCE(total_price::numeric, 0) as price,
  'pending'::order_status as status,
  jsonb_build_object(
    'delivery', COALESCE(delivery, false),
    'delivery_fee', COALESCE(delivery_fee, 0),
    'fulfilment_mode', COALESCE(fulfilment_mode, 'pickup'),
    'source', 'migrated_from_orders'
  ) as metadata
FROM public.orders
WHERE user_id IS NOT NULL
LIMIT 10
ON CONFLICT (id) DO NOTHING;

-- Create essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_listings_status_type ON public.unified_listings (status, type);
CREATE INDEX IF NOT EXISTS idx_unified_listings_owner_created ON public.unified_listings (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unified_orders_status_user ON public.unified_orders (status, user_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_created_desc ON public.unified_orders (created_at DESC);

-- Update table statistics for better query performance
ANALYZE public.unified_listings;
ANALYZE public.unified_orders;

-- Show migration summary
DO $$
DECLARE
    listings_count INTEGER;
    orders_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO listings_count FROM public.unified_listings;
    SELECT COUNT(*) INTO orders_count FROM public.unified_orders;
    
    RAISE NOTICE 'Unified schema ready with % listings and % orders', listings_count, orders_count;
    RAISE NOTICE 'Next step: Refactor admin pages to use unified tables';
END $$;
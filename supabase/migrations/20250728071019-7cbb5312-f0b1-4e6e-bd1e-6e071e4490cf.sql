-- Data Migration: Final working version based on actual schema

-- Migrate from products table to unified_listings
INSERT INTO public.unified_listings (
  type,
  title,
  description,
  price,
  owner_id,
  metadata,
  created_at,
  updated_at
)
SELECT 
  'product'::listing_type as type,
  COALESCE(name, 'Untitled Product') as title,
  description,
  price::numeric,
  business_id as owner_id,
  jsonb_build_object(
    'category', category,
    'stock_quantity', COALESCE(stock_quantity, stock_qty),
    'unit', unit,
    'sku', sku,
    'image_url', image_url
  ) as metadata,
  COALESCE(created_at, now()),
  COALESCE(created_at, now())
FROM public.products
WHERE business_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Create sample orders using the correct unified_orders schema
INSERT INTO public.unified_orders (
  user_id,
  listing_id,
  quantity,
  price,
  metadata,
  created_at,
  updated_at
)
SELECT 
  customer_id as user_id,
  product_id as listing_id,
  quantity::integer,
  total_amount::numeric as price,
  jsonb_build_object(
    'delivery_address', delivery_address,
    'payment_method', payment_method,
    'order_source', 'migrated'
  ) as metadata,
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM public.orders
WHERE customer_id IS NOT NULL AND product_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate conversations - create one per unique phone number
INSERT INTO public.conversations (
  contact_id,
  channel,
  started_at
)
SELECT DISTINCT ON (phone_number)
  phone_number as contact_id,
  'whatsapp' as channel,
  MIN(created_at) as started_at
FROM public.conversation_messages
WHERE phone_number IS NOT NULL
GROUP BY phone_number
ON CONFLICT DO NOTHING;

-- Migrate messages
INSERT INTO public.messages (
  conversation_id,
  sender_type,
  content,
  metadata,
  created_at
)
SELECT 
  c.id as conversation_id,
  CASE 
    WHEN cm.sender = 'user' THEN 'user'::message_sender_type
    WHEN cm.sender = 'agent' THEN 'agent'::message_sender_type
    ELSE 'system'::message_sender_type
  END as sender_type,
  COALESCE(cm.message_text, '[No content]') as content,
  jsonb_build_object(
    'message_type', COALESCE(cm.message_type, 'text'),
    'phone_number', cm.phone_number
  ) as metadata,
  COALESCE(cm.created_at, now())
FROM public.conversation_messages cm
JOIN public.conversations c ON c.contact_id = cm.phone_number
WHERE cm.phone_number IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Log migration results
DO $$
DECLARE
    listings_count INTEGER;
    orders_count INTEGER;
    conversations_count INTEGER;
    messages_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO listings_count FROM public.unified_listings;
    SELECT COUNT(*) INTO orders_count FROM public.unified_orders;
    SELECT COUNT(*) INTO conversations_count FROM public.conversations;
    SELECT COUNT(*) INTO messages_count FROM public.messages;
    
    RAISE NOTICE 'Migration completed: % listings, % orders, % conversations, % messages', 
        listings_count, orders_count, conversations_count, messages_count;
END $$;
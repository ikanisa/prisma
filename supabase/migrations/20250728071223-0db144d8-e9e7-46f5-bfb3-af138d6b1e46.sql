-- Data Migration: Final working version with correct column names

-- Migrate products to unified_listings
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
  COALESCE(description, '') as description,
  COALESCE(price::numeric, 0) as price,
  business_id as owner_id,
  jsonb_build_object(
    'category', category,
    'stock_quantity', COALESCE(stock_quantity, stock_qty, 0),
    'unit', unit,
    'sku', sku,
    'image_url', image_url
  ) as metadata,
  COALESCE(created_at::timestamptz, now()),
  COALESCE(created_at::timestamptz, now())
FROM public.products
WHERE business_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate orders to unified_orders
INSERT INTO public.unified_orders (
  user_id,
  quantity,
  price,
  metadata,
  created_at,
  updated_at
)
SELECT 
  user_id,
  1 as quantity, -- Default quantity since not specified in source
  COALESCE(total_price::numeric, 0) as price,
  jsonb_build_object(
    'business_id', business_id,
    'farmer_id', farmer_id,
    'driver_id', driver_id,
    'items', items,
    'delivery', delivery,
    'delivery_fee', delivery_fee,
    'fulfilment_mode', fulfilment_mode,
    'extras', extras,
    'cart_id', cart_id,
    'payment_id', payment_id
  ) as metadata,
  COALESCE(created_at::timestamptz, now()),
  COALESCE(created_at::timestamptz, now())
FROM public.orders
WHERE user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate conversations from conversation_messages
INSERT INTO public.conversations (
  contact_id,
  channel,
  started_at
)
SELECT DISTINCT ON (phone_number)
  phone_number as contact_id,
  'whatsapp' as channel,
  MIN(created_at::timestamptz) as started_at
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
    'phone_number', cm.phone_number,
    'channel', COALESCE(cm.channel, 'whatsapp')
  ) as metadata,
  COALESCE(cm.created_at::timestamptz, now())
FROM public.conversation_messages cm
JOIN public.conversations c ON c.contact_id = cm.phone_number
WHERE cm.phone_number IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_listings_type_owner ON public.unified_listings (type, owner_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_user_created ON public.unified_orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_channel ON public.conversations (contact_id, channel);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);

-- Update statistics
ANALYZE public.unified_listings;
ANALYZE public.unified_orders;
ANALYZE public.conversations;
ANALYZE public.messages;

-- Log the results
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
    
    RAISE NOTICE 'Data migration completed successfully:';
    RAISE NOTICE '  - Unified listings: %', listings_count;
    RAISE NOTICE '  - Unified orders: %', orders_count;
    RAISE NOTICE '  - Conversations: %', conversations_count;
    RAISE NOTICE '  - Messages: %', messages_count;
END $$;
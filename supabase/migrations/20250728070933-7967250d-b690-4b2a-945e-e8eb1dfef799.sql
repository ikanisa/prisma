-- Data Migration: Copy existing data into unified tables (final corrected version)

-- Migrate from products table 
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
    'image_url', image_url,
    'min_stock_level', min_stock_level
  ) as metadata,
  COALESCE(created_at, now()),
  COALESCE(created_at, now())
FROM public.products
WHERE business_id IS NOT NULL;

-- Migrate from existing orders if they exist
INSERT INTO public.unified_orders (
  user_id,
  vendor_id,
  order_type,
  total_amount,
  domain_metadata,
  created_at,
  updated_at
)
SELECT 
  customer_id as user_id,
  business_id as vendor_id,
  'product'::order_type as order_type,
  total_amount::numeric,
  jsonb_build_object(
    'quantity', quantity,
    'delivery_address', delivery_address,
    'payment_method', payment_method
  ) as domain_metadata,
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM public.orders
WHERE customer_id IS NOT NULL AND business_id IS NOT NULL;

-- Migrate conversations from conversation_messages (create unique conversations)
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
GROUP BY phone_number;

-- Now migrate messages linked to conversations
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
    'channel', COALESCE(cm.channel, 'whatsapp'),
    'phone_number', cm.phone_number
  ) as metadata,
  COALESCE(cm.created_at, now())
FROM public.conversation_messages cm
JOIN public.conversations c ON c.contact_id = cm.phone_number
WHERE cm.phone_number IS NOT NULL;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_unified_listings_type ON public.unified_listings (type);
CREATE INDEX IF NOT EXISTS idx_unified_listings_owner ON public.unified_listings (owner_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_user ON public.unified_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_vendor ON public.unified_orders (vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON public.conversations (channel);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages (sender_type);

-- Update table statistics for query optimization
ANALYZE public.unified_listings;
ANALYZE public.unified_orders;
ANALYZE public.conversations;
ANALYZE public.messages;
-- Data Migration: Copy existing data into unified tables (simple version)
-- Only migrate from tables that actually exist

-- Migrate from products table if it has data
INSERT INTO public.unified_listings (
  type,
  title,
  description,
  price,
  owner_id,
  metadata,
  status,
  created_at,
  updated_at
)
SELECT 
  'product'::listing_type as type,
  COALESCE(name, 'Untitled Product') as title,
  description,
  price,
  business_id as owner_id,
  COALESCE(jsonb_build_object(
    'category', category,
    'stock_quantity', stock_quantity
  ), '{}'::jsonb) as metadata,
  COALESCE(status::listing_status, 'active'::listing_status),
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM public.products
WHERE business_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate from existing orders if they exist
INSERT INTO public.unified_orders (
  user_id,
  vendor_id,
  order_type,
  status,
  total_amount,
  domain_metadata,
  created_at,
  updated_at
)
SELECT 
  customer_id as user_id,
  business_id as vendor_id,
  'product'::order_type as order_type,
  COALESCE(status::order_status, 'pending'::order_status),
  total_amount,
  COALESCE(jsonb_build_object(
    'quantity', quantity,
    'delivery_address', delivery_address
  ), '{}'::jsonb) as domain_metadata,
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM public.orders
WHERE customer_id IS NOT NULL AND business_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Migrate conversations from conversation_messages
INSERT INTO public.conversations (
  contact_id,
  channel,
  status,
  started_at
)
SELECT DISTINCT
  phone_number as contact_id,
  'whatsapp' as channel,
  'active'::conversation_status as status,
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
  COALESCE(jsonb_build_object(
    'message_type', cm.message_type,
    'channel', cm.channel
  ), '{}'::jsonb) as metadata,
  COALESCE(cm.created_at, now())
FROM public.conversation_messages cm
JOIN public.conversations c ON c.contact_id = cm.phone_number AND c.channel = 'whatsapp'
WHERE cm.phone_number IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Create essential indexes
CREATE INDEX IF NOT EXISTS idx_unified_listings_type_status ON public.unified_listings (type, status);
CREATE INDEX IF NOT EXISTS idx_unified_orders_user_vendor ON public.unified_orders (user_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact ON public.conversations (contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id, created_at DESC);

-- Update statistics
ANALYZE public.unified_listings;
ANALYZE public.unified_orders;
ANALYZE public.conversations;
ANALYZE public.messages;
-- Phase 3: Unified Schema Implementation (Fixed)
-- This migration implements the unified schema from the refactor plan

-- First, create the enum types for the unified schema
DO $$ BEGIN
    CREATE TYPE listing_type AS ENUM ('product', 'produce', 'property', 'vehicle', 'hardware');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('active', 'inactive', 'sold', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_type AS ENUM ('marketplace', 'produce', 'pharmacy', 'hardware', 'services');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM ('whatsapp', 'telegram', 'web', 'phone', 'email');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE sender_type AS ENUM ('user', 'agent', 'system', 'bot');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM ('text', 'image', 'document', 'location', 'interactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update existing unified_listings table to match the schema
DO $$ BEGIN
    -- Add listing_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'unified_listings' AND column_name = 'listing_type') THEN
        ALTER TABLE unified_listings ADD COLUMN listing_type listing_type DEFAULT 'product';
    END IF;
    
    -- Add listing_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'unified_listings' AND column_name = 'listing_status') THEN
        ALTER TABLE unified_listings ADD COLUMN listing_status listing_status DEFAULT 'active';
    END IF;
    
    -- Update the status column to use the enum if it exists and is text
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'unified_listings' AND column_name = 'status' AND data_type = 'text') THEN
        -- First update any invalid status values to 'active'
        UPDATE unified_listings SET status = 'active' WHERE status NOT IN ('active', 'inactive', 'sold', 'archived');
        ALTER TABLE unified_listings ALTER COLUMN status TYPE listing_status USING status::listing_status;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'unified_listings table updates: %', SQLERRM;
END $$;

-- Update existing unified_orders table to match the schema
DO $$ BEGIN
    -- Add order_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'unified_orders' AND column_name = 'order_type') THEN
        ALTER TABLE unified_orders ADD COLUMN order_type order_type DEFAULT 'marketplace';
    END IF;
    
    -- Add order_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'unified_orders' AND column_name = 'order_status') THEN
        ALTER TABLE unified_orders ADD COLUMN order_status order_status DEFAULT 'pending';
    END IF;
    
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'unified_orders' AND column_name = 'payment_status') THEN
        ALTER TABLE unified_orders ADD COLUMN payment_status payment_status DEFAULT 'pending';
    END IF;
    
    -- Update the status column to use the enum if it exists and is text
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'unified_orders' AND column_name = 'status' AND data_type = 'text') THEN
        -- First update any invalid status values to 'pending'
        UPDATE unified_orders SET status = 'pending' WHERE status NOT IN ('pending', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled', 'refunded');
        ALTER TABLE unified_orders ALTER COLUMN status TYPE order_status USING status::order_status;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'unified_orders table updates: %', SQLERRM;
END $$;

-- Update existing conversations table to match the schema
DO $$ BEGIN
    -- Add channel column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'channel') THEN
        ALTER TABLE conversations ADD COLUMN channel channel_type DEFAULT 'whatsapp';
    END IF;
    
    -- Add contact_phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'contact_phone') THEN
        ALTER TABLE conversations ADD COLUMN contact_phone text;
    END IF;
    
    -- Add agent_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'agent_id') THEN
        ALTER TABLE conversations ADD COLUMN agent_id uuid REFERENCES agents(id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'conversations table updates: %', SQLERRM;
END $$;

-- Update existing messages table to match the schema  
DO $$ BEGIN
    -- Add sender_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'sender_type') THEN
        ALTER TABLE messages ADD COLUMN sender_type sender_type DEFAULT 'user';
    END IF;
    
    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE messages ADD COLUMN message_type message_type DEFAULT 'text';
    END IF;
    
    -- Add message_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'message_status') THEN
        ALTER TABLE messages ADD COLUMN message_status message_status DEFAULT 'sent';
    END IF;
    
    -- Add sender_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'sender_id') THEN
        ALTER TABLE messages ADD COLUMN sender_id text;
    END IF;
    
    -- Add thread_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'thread_id') THEN
        ALTER TABLE messages ADD COLUMN thread_id text;
    END IF;
    
    -- Add reply_to_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'reply_to_id') THEN
        ALTER TABLE messages ADD COLUMN reply_to_id uuid REFERENCES messages(id);
    END IF;
    
    -- Update the status column to use the enum if it exists and is text
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'messages' AND column_name = 'status' AND data_type = 'text') THEN
        -- First update any invalid status values to 'sent'
        UPDATE messages SET status = 'sent' WHERE status NOT IN ('sent', 'delivered', 'read', 'failed');
        ALTER TABLE messages ALTER COLUMN status TYPE message_status USING status::message_status;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'messages table updates: %', SQLERRM;
END $$;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_unified_listings_type_status ON unified_listings(listing_type, status);
CREATE INDEX IF NOT EXISTS idx_unified_listings_vendor ON unified_listings(vendor_id);
CREATE INDEX IF NOT EXISTS idx_unified_listings_featured ON unified_listings(featured) WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_unified_orders_type_status ON unified_orders(order_type, status);
CREATE INDEX IF NOT EXISTS idx_unified_orders_customer ON unified_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_vendor ON unified_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_unified_orders_payment_status ON unified_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_conversations_contact_channel ON conversations(contact_id, channel);
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(contact_phone);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Add spatial index for listings if location_gps column exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'unified_listings' AND column_name = 'location_gps') THEN
        CREATE INDEX IF NOT EXISTS idx_unified_listings_location_gps ON unified_listings USING GIST(location_gps);
    END IF;
EXCEPTION
    WHEN OTHERS THEN null;
END $$;

-- Update RLS policies for unified tables to ensure proper security
-- unified_listings policies
DROP POLICY IF EXISTS "Public can view active listings" ON unified_listings;
DROP POLICY IF EXISTS "Vendors can manage own listings" ON unified_listings;
DROP POLICY IF EXISTS "System can manage all listings" ON unified_listings;

CREATE POLICY "Public can view active listings" ON unified_listings
    FOR SELECT USING (status = 'active' AND visibility = 'public');

CREATE POLICY "Vendors can manage own listings" ON unified_listings
    FOR ALL USING (vendor_id = auth.uid());

CREATE POLICY "System can manage all listings" ON unified_listings
    FOR ALL USING (true);

-- unified_orders policies  
DROP POLICY IF EXISTS "Customers can view own orders" ON unified_orders;
DROP POLICY IF EXISTS "Vendors can view own orders" ON unified_orders; 
DROP POLICY IF EXISTS "System can manage orders" ON unified_orders;

CREATE POLICY "Customers can view own orders" ON unified_orders
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Vendors can view own orders" ON unified_orders
    FOR SELECT USING (vendor_id = auth.uid());

CREATE POLICY "System can manage orders" ON unified_orders
    FOR ALL USING (true);

-- conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "System can manage conversations" ON conversations;

CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (contact_id = auth.uid());

CREATE POLICY "System can manage conversations" ON conversations
    FOR ALL USING (true);

-- messages policies
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "System can manage messages" ON messages;

CREATE POLICY "Users can view conversation messages" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations WHERE contact_id = auth.uid()
        )
    );

CREATE POLICY "System can manage messages" ON messages
    FOR ALL USING (true);
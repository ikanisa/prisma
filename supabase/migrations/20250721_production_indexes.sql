-- Production-ready database indexes for optimal performance
-- Run this migration to improve query performance across the application

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Users table - frequently queried by phone
CREATE INDEX IF NOT EXISTS idx_users_phone_active ON users(phone) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Conversations and messages - core communication tables
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_role ON agent_conversations(user_id, role);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_ts_desc ON agent_conversations(ts DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_phone_created ON conversation_messages(phone_number, created_at DESC);

-- Contacts - marketing and CRM queries
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts(last_interaction DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_conversion_status ON contacts(conversion_status);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);

-- Orders and commerce
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_carts_buyer_phone_status ON carts(buyer_phone, status);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_momo_code_status ON payments(momo_code, status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status_amount ON payments(status, amount);

-- Deliveries and drivers
CREATE INDEX IF NOT EXISTS idx_deliveries_order_status ON deliveries(order_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_status ON deliveries(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_drivers_online_kind ON drivers(is_online, driver_kind) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_drivers_location_online ON drivers USING GIST(current_location) WHERE is_online = true;

-- Listings and inventory
CREATE INDEX IF NOT EXISTS idx_unified_listings_seller_status ON unified_listings(seller_phone, status);
CREATE INDEX IF NOT EXISTS idx_unified_listings_category_status ON unified_listings(category, status);
CREATE INDEX IF NOT EXISTS idx_unified_listings_created_at ON unified_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_business_status ON products(business_id, status);
CREATE INDEX IF NOT EXISTS idx_products_category_available ON products(category) WHERE available = true;

-- Vehicle and property listings
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_seller_status ON vehicle_listings(seller_phone, status);
CREATE INDEX IF NOT EXISTS idx_property_listings_seller_status ON property_listings(seller_phone, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_listings_make_model ON vehicle_listings(make, model);
CREATE INDEX IF NOT EXISTS idx_property_listings_location ON property_listings(location);

-- Spatial indexes for geolocation
CREATE INDEX IF NOT EXISTS idx_businesses_location_gps ON businesses USING GIST(location_gps);
CREATE INDEX IF NOT EXISTS idx_canonical_locations_geom ON canonical_locations USING GIST(geom);

-- Agent and system logs
CREATE INDEX IF NOT EXISTS idx_agent_execution_log_function_timestamp ON agent_execution_log(function_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_execution_log_success_timestamp ON agent_execution_log(success_status, timestamp DESC);

-- Conversation analytics
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_phone_created ON conversation_analytics(phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_analytics_session_duration ON conversation_analytics(session_duration_minutes DESC);

-- Campaign management
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status_scheduled ON campaign_messages(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_subscribers_campaign_status ON campaign_subscribers(campaign_id, status);

-- Contact limits and rate limiting
CREATE INDEX IF NOT EXISTS idx_contact_limits_phone_opted_out ON contact_limits(phone_number, is_opted_out);
CREATE INDEX IF NOT EXISTS idx_contact_limits_daily_reset ON contact_limits(last_reset_daily, daily_count);

-- Conversation bridges for direct messaging
CREATE INDEX IF NOT EXISTS idx_conversation_bridges_buyer_seller ON conversation_bridges(buyer_phone, seller_phone);
CREATE INDEX IF NOT EXISTS idx_conversation_bridges_item_type_id ON conversation_bridges(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_bridge_conversations_bridge_created ON bridge_conversations(bridge_id, created_at DESC);

-- ============================================================================
-- PERFORMANCE VIEWS
-- ============================================================================

-- Active listings summary view
CREATE OR REPLACE VIEW active_listings_summary AS
SELECT 
  category,
  COUNT(*) as total_listings,
  COUNT(DISTINCT seller_phone) as unique_sellers,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM unified_listings 
WHERE status = 'active'
GROUP BY category;

-- Driver availability view
CREATE OR REPLACE VIEW available_drivers_summary AS
SELECT 
  driver_kind,
  COUNT(*) as available_count,
  AVG(rating) as avg_rating,
  COUNT(*) FILTER (WHERE current_location IS NOT NULL) as with_location
FROM drivers 
WHERE is_online = true
GROUP BY driver_kind;

-- Conversation performance view
CREATE OR REPLACE VIEW conversation_performance_daily AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_conversations,
  COUNT(DISTINCT phone_number) as unique_users,
  AVG(total_messages) as avg_messages_per_conversation,
  AVG(session_duration_minutes) as avg_duration_minutes,
  COUNT(*) FILTER (WHERE flow_completed = true) as completed_flows,
  AVG(satisfaction_rating) FILTER (WHERE satisfaction_rating IS NOT NULL) as avg_satisfaction
FROM conversation_analytics
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- PERFORMANCE FUNCTIONS
-- ============================================================================

-- Function to get system performance metrics
CREATE OR REPLACE FUNCTION get_system_performance_metrics(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC,
  metric_unit TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'avg_execution_time' as metric_name,
    AVG(execution_time_ms) as metric_value,
    'milliseconds' as metric_unit,
    MAX(timestamp) as recorded_at
  FROM agent_execution_log 
  WHERE timestamp >= NOW() - INTERVAL '1 day' * days_back
  
  UNION ALL
  
  SELECT 
    'success_rate' as metric_name,
    (COUNT(*) FILTER (WHERE success_status = true) * 100.0 / COUNT(*)) as metric_value,
    'percentage' as metric_unit,
    MAX(timestamp) as recorded_at
  FROM agent_execution_log 
  WHERE timestamp >= NOW() - INTERVAL '1 day' * days_back
  
  UNION ALL
  
  SELECT 
    'total_conversations' as metric_name,
    COUNT(*)::NUMERIC as metric_value,
    'count' as metric_unit,
    MAX(created_at) as recorded_at
  FROM conversation_analytics 
  WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
  
  UNION ALL
  
  SELECT 
    'avg_response_time' as metric_name,
    AVG(avg_response_time_ms) as metric_value,
    'milliseconds' as metric_unit,
    MAX(created_at) as recorded_at
  FROM conversation_analytics 
  WHERE created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Clean up old execution logs (older than 30 days)
  DELETE FROM agent_execution_log 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up old conversation analytics (older than 90 days)
  DELETE FROM conversation_analytics 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  -- Clean up old conversation messages (older than 60 days)
  DELETE FROM conversation_messages 
  WHERE created_at < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON INDEX idx_users_phone_active IS 'Optimizes user lookups by phone for active users';
COMMENT ON INDEX idx_agent_conversations_user_role IS 'Optimizes conversation history queries';
COMMENT ON INDEX idx_drivers_location_online IS 'Spatial index for finding nearby available drivers';
COMMENT ON VIEW active_listings_summary IS 'Provides quick overview of active listings by category';
COMMENT ON FUNCTION get_system_performance_metrics IS 'Returns key system performance indicators for monitoring';
COMMENT ON FUNCTION cleanup_old_data IS 'Removes old data to maintain database performance';
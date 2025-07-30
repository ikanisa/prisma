-- Fix security issues: Set search_path for all functions with SECURITY DEFINER
-- This prevents SQL injection via search_path manipulation

-- Fix functions with mutable search_path
ALTER FUNCTION public.update_template_button_updated_at() SET search_path = '';
ALTER FUNCTION public.cleanup_old_processed_messages() SET search_path = '';
ALTER FUNCTION public.payments_insert() SET search_path = '';
ALTER FUNCTION public.update_whatsapp_templates_updated_at() SET search_path = '';
ALTER FUNCTION public.trigger_automated_review() SET search_path = '';
ALTER FUNCTION public.cleanup_expired_cache() SET search_path = '';
ALTER FUNCTION public.resolve_gap() SET search_path = '';
ALTER FUNCTION public.detect_suspicious_activity() SET search_path = '';
ALTER FUNCTION public.cleanup_old_conversations() SET search_path = '';
ALTER FUNCTION public.update_document_embedding_status() SET search_path = '';
ALTER FUNCTION public.update_conversations_updated_at() SET search_path = '';
ALTER FUNCTION public.update_payments_updated_at() SET search_path = '';
ALTER FUNCTION public.cleanup_rate_limit_log() SET search_path = '';
ALTER FUNCTION public.update_unified_orders_updated_at() SET search_path = '';
ALTER FUNCTION public.search_agent_documents() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.payments_insert_enhanced() SET search_path = '';
ALTER FUNCTION public.clean_expired_memory_cache() SET search_path = '';
ALTER FUNCTION public.refresh_namespace() SET search_path = '';
ALTER FUNCTION public.complete_test_run() SET search_path = '';
ALTER FUNCTION public.update_button_usage() SET search_path = '';
ALTER FUNCTION public.run_knowledge_audit() SET search_path = '';
ALTER FUNCTION public.cleanup_old_messages() SET search_path = '';
ALTER FUNCTION public.generate_payment_ref() SET search_path = '';
ALTER FUNCTION public.check_enhanced_rate_limit() SET search_path = '';
ALTER FUNCTION public.update_embedding_timestamp() SET search_path = '';
ALTER FUNCTION public.update_unified_listings_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- Note: spatial_ref_sys is a PostGIS system table and should remain without RLS
-- It contains read-only coordinate system definitions needed for spatial operations
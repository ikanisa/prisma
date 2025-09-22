import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseClient, withDatabase, dbOperations } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { validateRequiredEnvVars, validateRequestBody, ValidationSchema } from "../_shared/validation.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse, handleCorsPrelight, PerformanceMonitor } from "../_shared/utils.ts";

// Validate environment at startup
validateRequiredEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

const requestSchema: ValidationSchema = {
  order_id: { required: true, type: 'string' },
  order_type: { required: false, type: 'string', enum: ['pharmacy', 'grocery', 'hardware'] }
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight();
  }

  const monitor = new PerformanceMonitor('assign-courier');
  const supabase = getSupabaseClient();

  try {
    const requestData = await req.json();
    
    // Validate request
    const validation = validateRequestBody(requestData, requestSchema);
    if (!validation.isValid) {
      return createErrorResponse(`Validation failed: ${validation.errors.join(', ')}`, 400);
    }

    const { order_id, order_type = 'pharmacy' } = requestData;
    
    logger.info('Assigning courier for order', { order_id, order_type });

    // Find available drivers using shared database operations
    const availableDrivers = await withDatabase(async (db) => {
      const { data, error } = await db
        .from('driver_sessions')
        .select(`
          driver_id,
          drivers!inner(
            id,
            full_name,
            momo_number,
            location_gps,
            driver_kind
          )
        `)
        .eq('status', 'online')
        .in('drivers.driver_kind', ['motorcycle', 'bicycle', 'scooter'])
        .limit(5);
      
      if (error) throw error;
      return data || [];
    }, supabase, 'find-available-drivers');

    if (availableDrivers.length === 0) {
      logger.warn('No available drivers found', { order_id, order_type });
      return createSuccessResponse({ 
        success: false, 
        error: 'No available drivers',
        available_drivers: 0 
      });
    }

    // Select the first available driver
    const selectedDriver = availableDrivers[0];
    logger.info('Driver selected for delivery', { 
      driver_id: selectedDriver.driver_id, 
      driver_name: selectedDriver.drivers.full_name 
    });

    // Create delivery record with transaction safety
    const delivery = await withDatabase(async (db) => {
      const { data, error } = await db
        .from('deliveries')
        .insert({
          order_id,
          driver_id: selectedDriver.driver_id,
          status: 'assigned',
          mode: order_type,
          pickup_eta: new Date(Date.now() + 15 * 60 * 1000)
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }, supabase, 'create-delivery');

    // Update order status
    const tableName = order_type === 'pharmacy' ? 'pharmacy_orders' : 'orders';
    await withDatabase(async (db) => {
      const { error } = await db
        .from(tableName)
        .update({ status: 'preparing' })
        .eq('id', order_id);
      
      if (error) throw error;
    }, supabase, 'update-order-status');

    monitor.end({ success: true, driver_assigned: selectedDriver.driver_id });
    
    return createSuccessResponse({
      success: true,
      delivery_id: delivery.id,
      driver_id: selectedDriver.driver_id,
      driver_name: selectedDriver.drivers.full_name,
      pickup_eta: delivery.pickup_eta,
      status: delivery.status
    });

  } catch (error) {
    monitor.end({ success: false, error: (error as Error).message });
    logger.error('Courier assignment failed', error, { order_id, order_type });
    return createErrorResponse(`Courier assignment failed: ${(error as Error).message}`, 500);
  }
});
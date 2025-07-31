import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";
import { validateRequiredEnvVars, validateRequestBody } from "../_shared/validation.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

// Validate environment variables
validateRequiredEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Validate request body
    const validation = validateRequestBody(requestData, {
      order_id: { required: true, type: 'string' },
      fulfilment_mode: { required: true, type: 'string' },
      delivery_address: { type: 'string' },
      extras: { type: 'object' }
    });

    if (!validation.isValid) {
      logger.warn('Invalid driver assignment request', { errors: validation.errors, requestData });
      return createErrorResponse('Validation failed', { errors: validation.errors });
    }

    const { order_id, fulfilment_mode, delivery_address, extras } = requestData;
    const supabaseClient = getSupabaseClient();

    // Update order with fulfilment details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .update({
        fulfilment_mode,
        delivery_address,
        extras: extras || {},
        status: 'paid'
      })
      .eq('id', order_id)
      .select(`
        *,
        carts(
          *,
          businesses(name, category, location_gps)
        )
      `)
      .single();

    if (orderError) throw orderError;

    const business = order.carts.businesses;
    const category = business.category;

    let response: any = {
      order_id,
      fulfilment_mode,
      status: 'confirmed'
    };

    // Handle different fulfillment modes
    if (fulfilment_mode === 'pickup' || fulfilment_mode === 'market_pickup') {
      // No driver needed for pickup
      response.message = `✅ Order confirmed! Pickup from ${business.name}`;
      response.eta = "Ready in 15-30 minutes";
      response.instructions = "Show this message when collecting your order";
      
    } else if (fulfilment_mode.includes('delivery') || fulfilment_mode.includes('table')) {
      // Need to assign driver/waiter
      
      // Determine driver type based on business category and fulfilment mode
      let driverType = 'moto'; // default
      if (category === 'bar' && fulfilment_mode.includes('table')) {
        driverType = 'waiter';
      } else if (fulfilment_mode === 'delivery_truck') {
        driverType = 'truck';
      }

      // Find available driver
      const { data: availableDrivers, error: driverError } = await supabaseClient
        .from('drivers')
        .select('*')
        .eq('is_online', true)
        .eq('driver_kind', driverType)
        .limit(5);

      if (driverError) throw driverError;

      let assignedDriver = null;
      if (availableDrivers && availableDrivers.length > 0) {
        // Simple assignment: pick first available
        // In production, would use distance/rating-based algorithm
        assignedDriver = availableDrivers[0];

        // Create delivery record
        const { data: delivery, error: deliveryError } = await supabaseClient
          .from('deliveries')
          .insert({
            order_id,
            driver_id: assignedDriver.id,
            mode: driverType,
            status: 'assigned',
            pickup_eta: new Date(Date.now() + 20 * 60 * 1000) // 20 mins from now
          })
          .select()
          .single();

        if (deliveryError) throw deliveryError;

        response.driver = {
          name: assignedDriver.full_name,
          phone: assignedDriver.momo_number,
          vehicle: assignedDriver.vehicle_plate,
          eta: "20-30 minutes"
        };
        response.delivery_id = delivery.id;
        response.tracking_link = `https://track.easymo.rw/delivery/${delivery.id}`;
        
        if (driverType === 'waiter') {
          response.message = `🍺 Your order is being prepared! ${assignedDriver.full_name} will serve you at ${extras?.table || 'your table'}.`;
        } else {
          response.message = `🏍️ Driver assigned! ${assignedDriver.full_name} will deliver to ${delivery_address}`;
        }

      } else {
        // No drivers available - offer pickup as fallback
        response.status = 'driver_unavailable';
        response.message = "⚠️ No drivers available. Would you like to pickup instead?";
        response.fallback_options = [
          { id: 'switch_to_pickup', title: '🚶 Switch to Pickup' },
          { id: 'wait_for_driver', title: '⏳ Wait for Driver (may take longer)' }
        ];
      }

      // Update order status to dispatched if driver assigned
      if (assignedDriver) {
        await supabaseClient
          .from('orders')
          .update({ status: 'dispatched' })
          .eq('id', order_id);
      }
    }

    // Calculate any delivery fees
    const deliveryFees = {
      'delivery_moto': 1000,
      'delivery_truck': 3000,
      'home_delivery': 800,
      'delivery': 500
    };

    const deliveryFee = deliveryFees[fulfilment_mode] || 0;
    if (deliveryFee > 0) {
      response.delivery_fee = deliveryFee;
      response.total_with_delivery = order.carts.total + deliveryFee;
    }

    // Log the driver assignment
    await supabaseClient
      .from('agent_execution_log')
      .insert({
        function_name: 'driver-assign',
        input_data: { order_id, fulfilment_mode, driver_assigned: !!assignedDriver },
        success_status: true,
        execution_time_ms: Date.now() % 1000,
        model_used: 'logistics-api'
      });

    return createSuccessResponse('Driver assignment completed', response);

  } catch (error) {
    logger.error('Error in driver-assign', error);
    return createErrorResponse('Driver assignment failed', { error: error.message }, 500);
  }
});
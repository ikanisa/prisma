import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!, 
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function executeTool(fn: { name: string; arguments: string }): Promise<any> {
  const args = JSON.parse(fn.arguments || "{}");
  console.log(`Executing tool: ${fn.name}`, args);

  switch (fn.name) {
    case "get_nearby_drivers": {
      const { lat, lng, radius_km = 2 } = args;
      
      const { data, error } = await supabase.rpc("fn_get_nearby_drivers_spatial", { 
        lat, 
        lng, 
        radius: radius_km 
      });
      
      if (error) {
        console.error("Error fetching nearby drivers:", error);
        return { error: error.message, drivers: [] };
      }
      
      return { drivers: data || [], count: data?.length || 0 };
    }

    case "create_booking": {
      const { driver_trip_id, passenger_phone, pickup, dropoff, fare_rwf } = args;
      
      // Find passenger intent if exists
      let passenger_intent_id = null;
      const { data: intent } = await supabase
        .from('passenger_intents_spatial')
        .select('id')
        .eq('passenger_phone', passenger_phone)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (intent) {
        passenger_intent_id = intent.id;
      }

      const { data, error } = await supabase
        .from("bookings_spatial")
        .insert({
          driver_trip_id,
          passenger_intent_id,
          fare_rwf,
          status: "pending",
          channel: "whatsapp"
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating booking:", error);
        return { error: error.message, booking: null };
      }
      
      return { 
        booking_id: data.id, 
        status: "pending",
        fare_rwf: data.fare_rwf
      };
    }

    case "search_listings": {
      const { query, category, location, max_price } = args;
      
      let queryBuilder = supabase
        .from('products')
        .select('id, name, description, price_rwf, category, stock_qty')
        .eq('status', 'active');
      
      if (category) {
        queryBuilder = queryBuilder.eq('category', category);
      }
      
      if (max_price) {
        queryBuilder = queryBuilder.lte('price_rwf', max_price);
      }
      
      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      }
      
      const { data, error } = await queryBuilder.limit(10);
      
      if (error) {
        console.error("Error searching listings:", error);
        return { error: error.message, products: [] };
      }
      
      return { products: data || [], count: data?.length || 0 };
    }

    case "list_properties": {
      const { location, property_type, max_price } = args;
      
      // This would integrate with properties table when implemented
      return { 
        properties: [], 
        count: 0,
        message: "Property listings coming soon" 
      };
    }

    case "generate_qr": {
      const { amount_rwf, phone_number, reference } = args;
      
      const response = await supabase.functions.invoke('generate-payment', {
        body: {
          amount: amount_rwf,
          phone: phone_number,
          reference,
          payment_method: 'momo'
        }
      });
      
      if (response.error) {
        return { error: response.error.message, qr_code: null };
      }
      
      return {
        qr_code_url: response.data?.qr_url,
        payment_reference: response.data?.reference,
        amount_rwf
      };
    }

    case "check_payment_status": {
      const { payment_reference } = args;
      
      const { data, error } = await supabase
        .from('payments')
        .select('status, paid_at, amount')
        .eq('reference', payment_reference)
        .single();
      
      if (error || !data) {
        return { status: 'not_found', paid: false };
      }
      
      return {
        status: data.status,
        paid: data.status === 'completed',
        paid_at: data.paid_at,
        amount: data.amount
      };
    }

    default:
      console.error(`Tool not implemented: ${fn.name}`);
      return { error: `Tool '${fn.name}' is not implemented` };
  }
}
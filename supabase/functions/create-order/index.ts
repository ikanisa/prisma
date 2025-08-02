import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  listing_id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata?: Record<string, any>;
}

interface CreateOrderRequest {
  order_type: 'marketplace' | 'produce' | 'pharmacy' | 'hardware' | 'services';
  customer_phone: string;
  customer_id?: string;
  vendor_id: string;
  items: OrderItem[];
  listing_ids: string[];
  subtotal: number;
  tax_amount?: number;
  delivery_fee?: number;
  total_amount: number;
  currency?: string;
  payment_method?: string;
  delivery_method?: string;
  delivery_address?: string;
  delivery_notes?: string;
  domain_metadata?: Record<string, any>;
  notes?: string;
}

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      throw new Error('Only POST method is allowed');
    }

    const orderData: CreateOrderRequest = await req.json();

    // Validate required fields
    if (!orderData.order_type) {
      throw new Error('order_type is required');
    }
    if (!orderData.customer_phone) {
      throw new Error('customer_phone is required');
    }
    if (!orderData.vendor_id) {
      throw new Error('vendor_id is required');
    }
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('items array is required and cannot be empty');
    }
    if (!orderData.total_amount || orderData.total_amount <= 0) {
      throw new Error('total_amount must be greater than 0');
    }

    // Validate items
    for (const item of orderData.items) {
      if (!item.listing_id || !item.title || !item.quantity || !item.unit_price) {
        throw new Error('Each item must have listing_id, title, quantity, and unit_price');
      }
      if (item.quantity <= 0 || item.unit_price <= 0) {
        throw new Error('Item quantity and unit_price must be greater than 0');
      }
    }

    // Verify listings exist and are active
    const listingIds = orderData.items.map(item => item.listing_id);
    const { data: listings, error: listingsError } = await supabaseClient
      .from('unified_listings')
      .select('id, status, vendor_id, stock_quantity')
      .in('id', listingIds);

    if (listingsError) {
      throw new Error(`Failed to verify listings: ${listingsError.message}`);
    }

    if (!listings || listings.length !== listingIds.length) {
      throw new Error('One or more listings not found');
    }

    // Check if all listings are active and belong to the same vendor
    for (const listing of listings) {
      if (listing.status !== 'active') {
        throw new Error(`Listing ${listing.id} is not active`);
      }
      if (listing.vendor_id !== orderData.vendor_id) {
        throw new Error(`Listing ${listing.id} does not belong to the specified vendor`);
      }
    }

    // Check stock availability (if applicable)
    for (const item of orderData.items) {
      const listing = listings.find(l => l.id === item.listing_id);
      if (listing?.stock_quantity !== null && listing.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for listing ${item.listing_id}. Available: ${listing.stock_quantity}, Requested: ${item.quantity}`);
      }
    }

    // Calculate and verify totals
    const calculatedSubtotal = orderData.items.reduce(
      (sum, item) => sum + (item.unit_price * item.quantity), 
      0
    );
    
    if (Math.abs(calculatedSubtotal - orderData.subtotal) > 0.01) {
      throw new Error('Subtotal calculation mismatch');
    }

    const expectedTotal = orderData.subtotal + (orderData.tax_amount || 0) + (orderData.delivery_fee || 0);
    if (Math.abs(expectedTotal - orderData.total_amount) > 0.01) {
      throw new Error('Total amount calculation mismatch');
    }

    // Create the order
    const orderToInsert = {
      order_type: orderData.order_type,
      customer_phone: orderData.customer_phone,
      customer_id: orderData.customer_id,
      vendor_id: orderData.vendor_id,
      items: orderData.items,
      listing_ids: orderData.listing_ids,
      subtotal: orderData.subtotal,
      tax_amount: orderData.tax_amount || 0,
      delivery_fee: orderData.delivery_fee || 0,
      total_amount: orderData.total_amount,
      currency: orderData.currency || 'RWF',
      status: 'pending',
      payment_status: 'pending',
      payment_method: orderData.payment_method,
      delivery_method: orderData.delivery_method,
      delivery_address: orderData.delivery_address,
      delivery_notes: orderData.delivery_notes,
      domain_metadata: orderData.domain_metadata || {},
      notes: orderData.notes
    };

    const { data: order, error: orderError } = await supabaseClient
      .from('unified_orders')
      .insert(orderToInsert)
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Update stock quantities (if applicable)
    for (const item of orderData.items) {
      const listing = listings.find(l => l.id === item.listing_id);
      if (listing?.stock_quantity !== null) {
        const { error: stockError } = await supabaseClient
          .from('unified_listings')
          .update({ 
            stock_quantity: listing.stock_quantity - item.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.listing_id);

        if (stockError) {
          console.error(`Failed to update stock for listing ${item.listing_id}:`, stockError);
        }
      }
    }

    // Log the order creation
    console.log(`Order created successfully: ${order.id} for customer ${orderData.customer_phone}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: order,
        message: 'Order created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    );

  } catch (error) {
    console.error('Error creating order:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create order',
        message: 'Order creation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
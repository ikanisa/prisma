import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client using service role for server-side operations
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Supabase URL or service role key missing");
}

  auth: {
    persistSession: false,
  },
});

interface CreateOrderBody {
  user_id: string;
  listing_id: string;
  quantity?: number;
  price: number;
  metadata?: Record<string, unknown>;
}

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = (await req.json()) as CreateOrderBody;
    const { user_id, listing_id, quantity = 1, price, metadata } = body;

    console.log("Creating order with data:", { user_id, listing_id, quantity, price });

    // Basic validation
    if (!user_id || !listing_id || !price || typeof price !== "number") {
      return new Response(JSON.stringify({ error: "Missing or invalid parameters" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    if (quantity <= 0) {
      return new Response(JSON.stringify({ error: "Quantity must be greater than zero" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify the listing exists
    const { data: listing, error: listingError } = await supabase
      .from("unified_listings")
      .select("id, title, status")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      console.error("Listing not found:", listingError);
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (listing.status !== 'active') {
      return new Response(JSON.stringify({ error: "Listing is not active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Insert new order into unified_orders
    const { data, error } = await supabase.from("unified_orders").insert({
      user_id,
      listing_id,
      quantity,
      price,
      metadata: metadata ?? {},
    }).select().single();

    if (error) {
      console.error("Failed to create order", error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Order created successfully:", data);

    return new Response(JSON.stringify({ success: true, order: data }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
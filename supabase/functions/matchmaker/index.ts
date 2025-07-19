import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running produce matchmaker...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get active listings from last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: listings, error: listingsError } = await supabase
      .from('produce_listings')
      .select(`
        *,
        farmers (district, whatsapp, full_name)
      `)
      .eq('status', 'active')
      .gte('created_at', fourteenDaysAgo.toISOString());

    if (listingsError) throw listingsError;

    // Get buyer requirements (simulated - would come from buyer profiles)
    const buyerRequirements = await getBuyerRequirements(supabase);

    let totalMatches = 0;
    const matchResults = [];

    for (const listing of listings || []) {
      const matches = await findMatches(listing, buyerRequirements);
      
      for (const match of matches) {
        try {
          // Create match record
          const { data: matchRecord, error: matchError } = await supabase
            .from('produce_matches')
            .insert({
              listing_id: listing.id,
              buyer_id: match.buyer_id,
              required_qty: match.required_qty,
              matched_at: new Date().toISOString(),
              status: 'pending'
            })
            .select('*')
            .single();

          if (matchError) {
            console.error('Match creation error:', matchError);
            continue;
          }

          // Notify farmer
          await notifyFarmer(supabase, listing, match);
          
          // Notify buyer
          await notifyBuyer(supabase, listing, match);

          totalMatches++;
          matchResults.push({
            listing_id: listing.id,
            buyer_id: match.buyer_id,
            product: listing.product_name,
            district: listing.farmers.district
          });

        } catch (error) {
          console.error('Error creating match:', error);
        }
      }
    }

    console.log(`Matchmaker completed: ${totalMatches} new matches created`);

    return new Response(JSON.stringify({
      success: true,
      matches_created: totalMatches,
      results: matchResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Matchmaker error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getBuyerRequirements(supabase: any) {
  // Simulate buyer requirements - in real app would come from buyer profiles
  return [
    {
      buyer_id: 'buyer_1',
      buyer_name: 'Kigali Restaurant',
      whatsapp: '+250788123456',
      district: 'kigali',
      products_needed: ['potatoes', 'tomatoes', 'onions'],
      max_price: 300,
      min_quantity: 20,
      max_quantity: 100
    },
    {
      buyer_id: 'buyer_2',
      buyer_name: 'Musanze Cooperative',
      whatsapp: '+250788234567',
      district: 'musanze',
      products_needed: ['maize', 'beans'],
      max_price: 400,
      min_quantity: 50,
      max_quantity: 500
    },
    {
      buyer_id: 'buyer_3',
      buyer_name: 'Huye Market',
      whatsapp: '+250788345678',
      district: 'huye',
      products_needed: ['bananas', 'cassava'],
      max_price: 200,
      min_quantity: 30,
      max_quantity: 200
    }
  ];
}

async function findMatches(listing: any, buyerRequirements: any[]) {
  const matches = [];

  for (const buyer of buyerRequirements) {
    // Check if buyer wants this product
    if (!buyer.products_needed.includes(listing.product_name.toLowerCase())) {
      continue;
    }

    // Check district proximity (same district or neighboring)
    if (!isNearbyDistrict(listing.farmers.district, buyer.district)) {
      continue;
    }

    // Check price range
    if (listing.price > buyer.max_price) {
      continue;
    }

    // Check quantity availability
    const availableQty = listing.quantity;
    if (availableQty < buyer.min_quantity) {
      continue;
    }

    // Calculate match quantity
    const matchQty = Math.min(availableQty, buyer.max_quantity);

    matches.push({
      buyer_id: buyer.buyer_id,
      buyer_name: buyer.buyer_name,
      buyer_whatsapp: buyer.whatsapp,
      required_qty: matchQty,
      price_offered: listing.price,
      match_score: calculateMatchScore(listing, buyer)
    });
  }

  // Sort by match score (highest first)
  return matches.sort((a, b) => b.match_score - a.match_score);
}

function isNearbyDistrict(district1: string, district2: string) {
  if (district1?.toLowerCase() === district2?.toLowerCase()) {
    return true;
  }

  // Define neighboring districts
  const neighborMap: { [key: string]: string[] } = {
    'kigali': ['bugesera', 'rwamagana', 'kayonza'],
    'musanze': ['gakenke', 'gicumbi', 'burera'],
    'huye': ['nyanza', 'ruhango', 'gisagara'],
    'rubavu': ['nyabihu', 'ngororero'],
    'kayonza': ['kigali', 'rwamagana', 'gatsibo']
  };

  const neighbors = neighborMap[district1?.toLowerCase()] || [];
  return neighbors.includes(district2?.toLowerCase());
}

function calculateMatchScore(listing: any, buyer: any) {
  let score = 0;

  // Same district gets higher score
  if (listing.farmers.district?.toLowerCase() === buyer.district?.toLowerCase()) {
    score += 50;
  }

  // Quantity match (closer to buyer's preferred range)
  const qtyMatch = Math.min(listing.quantity, buyer.max_quantity) / buyer.max_quantity;
  score += qtyMatch * 30;

  // Price attractiveness (lower price = higher score)
  const priceScore = Math.max(0, (buyer.max_price - listing.price) / buyer.max_price);
  score += priceScore * 20;

  return score;
}

async function notifyFarmer(supabase: any, listing: any, match: any) {
  console.log(`Notifying farmer ${listing.farmers.whatsapp} about buyer interest`);
  
  // This would send WhatsApp message via webhook
  const message = `🎉 Good news! ${match.buyer_name} wants to buy ${match.required_qty} ${listing.unit} of your ${listing.product_name} at ${listing.price} RWF/${listing.unit}. Reply YES to accept or NO to decline.`;
  
  console.log('Would send to farmer:', message);
}

async function notifyBuyer(supabase: any, listing: any, match: any) {
  console.log(`Notifying buyer ${match.buyer_whatsapp} about available produce`);
  
  const message = `🌱 Fresh ${listing.product_name} available! ${listing.quantity} ${listing.unit} at ${listing.price} RWF/${listing.unit} from ${listing.farmers.district}. Interested? Reply YES for contact details.`;
  
  console.log('Would send to buyer:', message);
}
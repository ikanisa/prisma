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
    const { draft_id, farmer_whatsapp } = await req.json();
    
    console.log(`Publishing draft ${draft_id} for farmer ${farmer_whatsapp}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the draft
    const { data: draft, error: draftError } = await supabase
      .from('produce_drafts')
      .select(`
        *,
        farmers (id, district, full_name)
      `)
      .eq('id', draft_id)
      .single();

    if (draftError || !draft) {
      throw new Error('Draft not found');
    }

    // Create expiry date (14 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Create the listing
    const { data: listing, error: listingError } = await supabase
      .from('produce_listings')
      .insert({
        farmer_id: draft.farmer_id,
        product_name: draft.product_name,
        quantity: draft.quantity,
        unit: draft.unit,
        price: draft.price,
        photo_url: draft.photo_url,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        grade: determineGrade(draft.product_name, draft.photo_url)
      })
      .select('*')
      .single();

    if (listingError) throw listingError;

    // Mark draft as published
    await supabase
      .from('produce_drafts')
      .update({ status: 'published' })
      .eq('id', draft_id);

    // Add to search index (Pinecone simulation)
    await addToSearchIndex(listing, draft.farmers);

    // Notify potential buyers
    await notifyBuyers(supabase, listing, draft.farmers);

    return new Response(JSON.stringify({
      success: true,
      listing_id: listing.id,
      message: `✅ ${listing.product_name} listing is now live! We'll notify you when buyers show interest.`,
      listing: {
        id: listing.id,
        product: listing.product_name,
        quantity: listing.quantity,
        unit: listing.unit,
        price: listing.price,
        district: draft.farmers.district
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Listing publish error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function determineGrade(product: string, photoUrl?: string) {
  // Simplified grading logic
  if (photoUrl) {
    // If photo provided, assume good quality
    return 'Grade A';
  }
  
  // Default grading based on product type
  const premiumProducts = ['rice', 'coffee', 'tea'];
  if (premiumProducts.includes(product.toLowerCase())) {
    return 'Grade B+';
  }
  
  return 'Grade B';
}

async function addToSearchIndex(listing: any, farmer: any) {
  // This would integrate with Pinecone for vector search
  // For now, just log the action
  console.log('Adding to search index:', {
    listing_id: listing.id,
    product: listing.product_name,
    district: farmer.district,
    keywords: generateKeywords(listing.product_name, farmer.district)
  });
}

function generateKeywords(product: string, district: string) {
  const keywords = [product.toLowerCase()];
  
  // Add synonyms
  const synonyms: { [key: string]: string[] } = {
    'maize': ['corn', 'ibigori'],
    'beans': ['amaru', 'legumes'],
    'potatoes': ['ibirayi'],
    'bananas': ['ibisheke', 'banana']
  };

  if (synonyms[product.toLowerCase()]) {
    keywords.push(...synonyms[product.toLowerCase()]);
  }

  keywords.push(district.toLowerCase());
  
  return keywords;
}

async function notifyBuyers(supabase: any, listing: any, farmer: any) {
  // Find buyers looking for this product in the same region
  const { data: interestedBuyers } = await supabase
    .from('buyer_preferences')
    .select('buyer_id, preferred_products, max_distance')
    .contains('preferred_products', [listing.product_name])
    .eq('district', farmer.district);

  if (interestedBuyers && interestedBuyers.length > 0) {
    console.log(`Notifying ${interestedBuyers.length} potential buyers`);
    
    // This would trigger WhatsApp notifications to buyers
    // For now, just log the notifications
    for (const buyer of interestedBuyers) {
      console.log(`Would notify buyer ${buyer.buyer_id} about new ${listing.product_name} listing`);
    }
  }
}
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, farmer_whatsapp } = await req.json();
    
    console.log('Parsing produce text:', text);

    const parseResult = parseProduceMessage(text);
    
    if (parseResult.success) {
      // Store as draft
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get or create farmer
      let { data: farmer } = await supabase
        .from('farmers')
        .select('id')
        .eq('whatsapp', farmer_whatsapp)
        .single();

      if (!farmer) {
        const { data: newFarmer, error: farmerError } = await supabase
          .from('farmers')
          .insert({
            whatsapp: farmer_whatsapp,
            status: 'active'
          })
          .select('id')
          .single();

        if (farmerError) throw farmerError;
        farmer = newFarmer;
      }

      // Create produce draft
      const { data: draft, error: draftError } = await supabase
        .from('produce_drafts')
        .insert({
          farmer_id: farmer.id,
          product_name: parseResult.product,
          quantity: parseResult.quantity,
          unit: parseResult.unit,
          price: parseResult.price,
          status: 'draft'
        })
        .select('*')
        .single();

      if (draftError) throw draftError;

      return new Response(JSON.stringify({
        success: true,
        parsed: parseResult,
        draft_id: draft.id,
        message: `Got it: ${parseResult.quantity} ${parseResult.unit} ${parseResult.product} 🌱. Confirm (✅)?`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: parseResult.error,
        suggestions: [
          "Try: '50 kg maize' or '10 ibisheke'",
          "Include quantity and product name",
          "Use voice message if typing is difficult"
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Parse produce error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseProduceMessage(text: string) {
  const cleanText = text.toLowerCase().trim();
  
  // Common Kinyarwanda/English produce patterns
  const patterns = [
    // Pattern: "10 ibisheke" (bananas)
    /(\d+)\s*(ibisheke|bananas?)/i,
    // Pattern: "50 kg maize"
    /(\d+)\s*(kg|ton|bunch|crate)\s+(\w+)/i,
    // Pattern: "maize 50 kg"
    /(\w+)\s+(\d+)\s*(kg|ton|bunch|crate)/i,
    // Pattern: "10 sacks potatoes"
    /(\d+)\s*(sacks?|bags?)\s+(\w+)/i
  ];

  // Product name mappings
  const productMappings: { [key: string]: string } = {
    'ibisheke': 'bananas',
    'ibirayi': 'potatoes',
    'ibigori': 'maize',
    'amaru': 'beans',
    'igikoma': 'rice',
    'inkoko': 'chicken',
    'amata': 'milk',
    'inyama': 'meat'
  };

  // Unit mappings
  const unitMappings: { [key: string]: string } = {
    'sacks': 'kg',
    'bags': 'kg',
    'sack': 'kg',
    'bag': 'kg'
  };

  for (const pattern of patterns) {
    const match = cleanText.match(pattern);
    if (match) {
      let quantity, unit, product;

      if (pattern.source.includes('ibisheke')) {
        // Special case for bananas
        quantity = parseInt(match[1]);
        unit = 'bunch';
        product = 'bananas';
      } else if (match.length === 4) {
        // quantity + unit + product
        quantity = parseInt(match[1]);
        unit = unitMappings[match[2]] || match[2];
        product = productMappings[match[3]] || match[3];
      } else if (match.length === 3) {
        // product + quantity + unit
        product = productMappings[match[1]] || match[1];
        quantity = parseInt(match[2]);
        unit = unitMappings[match[3]] || match[3];
      }

      if (quantity && unit && product) {
        // Convert sacks/bags to kg (estimate)
        if (unit === 'kg' && (cleanText.includes('sack') || cleanText.includes('bag'))) {
          quantity = quantity * 50; // Assume 50kg per sack
        }

        return {
          success: true,
          quantity,
          unit,
          product,
          confidence: 0.8
        };
      }
    }
  }

  return {
    success: false,
    error: 'Could not parse produce information',
    confidence: 0.0
  };
}
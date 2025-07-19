import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { products, vendor_id } = await req.json();
    
    if (!products || !Array.isArray(products)) {
      throw new Error('Products array is required');
    }

    console.log('Auto-tagging products for vendor:', vendor_id);

    // Use OpenAI to suggest categories
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a hardware store categorization expert. Categorize each product into one of these categories:
            - plumbing (🚿): pipes, fittings, valves, taps, etc.
            - electrical (⚡): wires, switches, outlets, bulbs, etc.
            - tools (🔧): hammers, screwdrivers, drills, measuring tools, etc.
            - paint (🎨): paint, brushes, rollers, primers, etc.
            - fasteners (🔩): nails, screws, bolts, nuts, etc.
            - hardware (🔨): hinges, locks, handles, chains, etc.
            - building (🏗️): cement, bricks, tiles, roofing, etc.
            - safety (🦺): gloves, goggles, helmets, masks, etc.
            - other: anything that doesn't fit above
            
            Return JSON array with fields: id, suggested_category, confidence (0-1).`
          },
          {
            role: 'user',
            content: `Categorize these hardware products: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, description: p.description })))}`
          }
        ],
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices[0].message.content;
    
    // Parse JSON from response
    let suggestions;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Failed to parse categorization suggestions');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Apply high-confidence suggestions (>0.8) automatically
    const highConfidenceSuggestions = suggestions.filter((s: any) => s.confidence > 0.8);
    
    if (highConfidenceSuggestions.length > 0) {
      for (const suggestion of highConfidenceSuggestions) {
        await supabase
          .from('products')
          .update({ category: suggestion.suggested_category })
          .eq('id', suggestion.id);
      }
    }

    console.log(`Applied ${highConfidenceSuggestions.length} high-confidence category suggestions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        suggestions,
        auto_applied: highConfidenceSuggestions.length,
        manual_review: suggestions.length - highConfidenceSuggestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in bulk-tag-autocomplete:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_data, shopper_id, order_id } = await req.json();
    
    if (!image_data || !shopper_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: image_data, shopper_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI Vision API to analyze prescription image
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a certified Rwanda pharmacist assistant. Analyze prescription images and extract medication names, dosages, and quantities. Return as JSON array of objects with fields: name, dosage, quantity, instructions.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all medications from this prescription image. Include drug names, dosages, and quantities.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image_data}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    const openAIData = await openAIResponse.json();
    
    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', openAIData);
      return new Response(
        JSON.stringify({ error: 'Failed to analyze prescription image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedText = openAIData.choices[0].message.content;
    let detectedItems = [];
    
    try {
      // Try to parse as JSON, fallback to text extraction
      detectedItems = JSON.parse(extractedText);
    } catch (e) {
      // If not valid JSON, parse text for drug names
      const lines = extractedText.split('\n');
      detectedItems = lines
        .filter(line => line.trim().length > 0)
        .map(line => ({
          name: line.trim(),
          dosage: 'As prescribed',
          quantity: 1,
          instructions: 'Follow doctor instructions'
        }));
    }

    // Store prescription image record
    const { data: prescriptionRecord, error: dbError } = await supabase
      .from('prescription_images')
      .insert({
        shopper_id,
        order_id,
        storage_path: `prescriptions/${shopper_id}/${Date.now()}.jpg`,
        ocr_text: extractedText,
        detected_items: detectedItems
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save prescription data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        prescription_id: prescriptionRecord.id,
        detected_items: detectedItems,
        extracted_text: extractedText,
        confidence: detectedItems.length > 0 ? 0.8 : 0.4
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in rx-ocr function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
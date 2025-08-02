import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, documentType = 'general' } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Define extraction prompts based on document type
    const prompts: Record<string, string> = {
      logbook: `Extract vehicle information from this logbook. Return JSON with:
        {
          "number_plate": "vehicle registration number",
          "owner_name": "owner's name",
          "vehicle_make": "vehicle make/brand",
          "vehicle_model": "vehicle model",
          "vehicle_year": "year of manufacture",
          "engine_number": "engine number if visible",
          "chassis_number": "chassis number if visible"
        }`,
      
      business_license: `Extract business information from this license/permit. Return JSON with:
        {
          "business_name": "registered business name",
          "license_number": "license/permit number",
          "owner_name": "owner/contact person name",
          "address": "business address",
          "category": "business category/type",
          "issue_date": "issue date if visible",
          "expiry_date": "expiry date if visible"
        }`,
      
      general: `Extract all readable text and structured information from this document. Return JSON with:
        {
          "extracted_text": "all readable text",
          "key_information": "important details like names, numbers, dates, addresses"
        }`
    };

    const prompt = prompts[documentType] || prompts.general;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0].message.content;

    // Try to parse as JSON
    let extractedData;
    try {
      extractedData = JSON.parse(extractedText);
    } catch (e) {
      // If not valid JSON, return as text
      extractedData = {
        extracted_text: extractedText,
        parsing_error: 'Could not parse as structured data'
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentType,
        extractedData,
        confidence: data.choices[0].finish_reason === 'stop' ? 0.9 : 0.7
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ocr-document function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
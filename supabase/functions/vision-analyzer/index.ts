import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, createChatCompletion } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;


serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_url, prompt = "Describe this image in detail for a marketplace listing", listing_type = "general" } = await req.json();

    if (!image_url) {
      throw new Error('Image URL is required');
    }

    console.log('Analyzing image:', image_url, 'for type:', listing_type);

    const visionPrompt = getVisionPrompt(listing_type, prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            { type: 'image_url', image_url: { url: image_url } }
          ]
        }],
        max_tokens: 300,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Vision API error:', errorText);
      throw new Error(`Vision analysis failed: ${errorText}`);
    }

    const result = await response.json();
    const analysis = result.choices[0].message.content;

    // Extract tags and quality score
    const tags = extractTags(analysis, listing_type);
    const qualityScore = assessImageQuality(analysis);

    // Store analysis result
    const { data: analysisRecord } = await supabase
      .from('image_analysis')
      .insert({
        image_url,
        listing_type,
        analysis_text: analysis,
        extracted_tags: tags,
        quality_score: qualityScore,
        model_used: 'gpt-4o'
      })
      .select()
      .single();

    console.log('Vision analysis complete:', { tags, qualityScore });

    return new Response(JSON.stringify({
      analysis,
      tags,
      quality_score: qualityScore,
      listing_type,
      analysis_id: analysisRecord?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Vision analyzer error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function getVisionPrompt(listingType: string, customPrompt: string): string {
  const prompts = {
    vehicle: `Analyze this vehicle image for a marketplace listing. Describe:
1. Vehicle type (car, motorcycle, truck, etc.)
2. Estimated age/condition
3. Visible features and characteristics
4. Any damage or wear visible
5. Quality of the photo itself
Rate the image quality from 1-10 for marketplace use.`,

    property: `Analyze this property image for a real estate listing. Describe:
1. Property type (house, apartment, land, commercial)
2. Architectural style and condition
3. Visible features and amenities
4. Surroundings and location context
5. Photo quality and presentation
Rate the image quality from 1-10 for real estate use.`,

    product: `Analyze this product image for a marketplace listing. Describe:
1. Product category and type
2. Condition and quality visible
3. Notable features or characteristics
4. Background and presentation
5. Image clarity and commercial appeal
Rate the image quality from 1-10 for marketplace use.`,

    general: customPrompt
  };

  return prompts[listingType as keyof typeof prompts] || prompts.general;
}

function extractTags(analysis: string, listingType: string): string[] {
  const commonTags: { [key: string]: string[] } = {
    vehicle: ['car', 'motorcycle', 'truck', 'new', 'used', 'good condition', 'poor condition', 'damaged', 'clean'],
    property: ['house', 'apartment', 'land', 'commercial', 'modern', 'traditional', 'furnished', 'vacant'],
    product: ['electronics', 'clothing', 'furniture', 'tools', 'books', 'new', 'used', 'vintage']
  };

  const tags: string[] = [];
  const analysisLower = analysis.toLowerCase();
  
  // Extract type-specific tags
  const typeTagsss = commonTags[listingType] || commonTags.product;
  typeTagsss.forEach(tag => {
    if (analysisLower.includes(tag)) {
      tags.push(tag);
    }
  });

  // Extract condition indicators
  const conditionIndicators = ['excellent', 'good', 'fair', 'poor', 'damaged', 'new', 'used', 'vintage'];
  conditionIndicators.forEach(condition => {
    if (analysisLower.includes(condition)) {
      tags.push(condition);
    }
  });

  return [...new Set(tags)]; // Remove duplicates
}

function assessImageQuality(analysis: string): number {
  const analysisLower = analysis.toLowerCase();
  let score = 5; // Base score
  
  // Positive indicators
  if (analysisLower.includes('clear') || analysisLower.includes('sharp')) score += 1;
  if (analysisLower.includes('good lighting') || analysisLower.includes('well lit')) score += 1;
  if (analysisLower.includes('professional') || analysisLower.includes('high quality')) score += 1;
  if (analysisLower.includes('detailed') || analysisLower.includes('close-up')) score += 0.5;
  
  // Negative indicators
  if (analysisLower.includes('blurry') || analysisLower.includes('unclear')) score -= 2;
  if (analysisLower.includes('dark') || analysisLower.includes('poor lighting')) score -= 1;
  if (analysisLower.includes('grainy') || analysisLower.includes('low quality')) score -= 1;
  if (analysisLower.includes('distant') || analysisLower.includes('far away')) score -= 0.5;
  
  // Extract explicit rating if present
  const ratingMatch = analysis.match(/(\d+)\/10|(\d+) out of 10/i);
  if (ratingMatch) {
    const explicitRating = parseInt(ratingMatch[1] || ratingMatch[2]);
    if (explicitRating >= 1 && explicitRating <= 10) {
      score = explicitRating;
    }
  }
  
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}
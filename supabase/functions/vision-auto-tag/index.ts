import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { imageUrl, listingId, listingType = 'general' } = await req.json();

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log(`Analyzing image: ${imageUrl} for listing: ${listingId}`);

    // Call GPT-4o-vision to analyze the image
    const visionPrompt = getVisionPrompt(listingType);
    
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
              { type: 'text', text: visionPrompt },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;
    console.log('Vision analysis result:', analysis);

    // Extract tags and quality assessment
    const tags = extractTags(analysis, listingType);
    const qualityScore = assessImageQuality(analysis);
    const condition = extractCondition(analysis);

    // Store the analysis in the database
    const { data: analysisRecord, error: insertError } = await supabase
      .from('image_analysis')
      .insert({
        listing_id: listingId,
        listing_type: listingType,
        image_url: imageUrl,
        analysis_text: analysis,
        extracted_tags: tags,
        quality_score: qualityScore,
        condition_assessment: condition
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw insertError;
    }

    // Update the listing with auto-generated tags if listingId provided
    if (listingId) {
      await updateListingTags(supabase, listingId, listingType, tags, qualityScore, condition);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      tags,
      qualityScore,
      condition,
      analysisId: analysisRecord.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vision-auto-tag function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getVisionPrompt(listingType: string): string {
  const basePrompt = `Analyze this image and provide a detailed assessment. Focus on:`;
  
  switch (listingType) {
    case 'vehicle':
      return `${basePrompt}
1. Vehicle type, make, model if visible
2. Condition (excellent, good, fair, poor) with specific details
3. Visible damage, wear, or maintenance issues
4. Features visible (interior, exterior, wheels, etc.)
5. Image quality and clarity
6. Any safety concerns or notable characteristics

Provide specific, detailed observations that would help buyers assess the vehicle.`;

    case 'property':
      return `${basePrompt}
1. Property type (house, apartment, land, commercial, etc.)
2. Condition of structure and surroundings
3. Visible features (rooms, amenities, location characteristics)
4. Maintenance state and any visible issues
5. Image quality and how well it represents the property
6. Architectural style and notable features

Focus on details that would inform potential buyers or renters.`;

    case 'product':
      return `${basePrompt}
1. Product category and type
2. Condition (new, like new, good, fair, poor)
3. Visible defects, wear, or damage
4. Brand, model, or identifying features if visible
5. Packaging or presentation quality
6. Image clarity and how well it shows the product

Provide observations that would help determine value and condition.`;

    default:
      return `${basePrompt}
1. What is shown in the image
2. Overall condition and quality
3. Notable features or characteristics
4. Any defects, damage, or wear visible
5. Image quality and clarity
6. Professional presentation level

Provide a comprehensive assessment of what's shown.`;
  }
}

function extractTags(analysis: string, listingType: string): string[] {
  const tags: string[] = [];
  const lowerAnalysis = analysis.toLowerCase();

  // Common condition tags
  const conditions = ['excellent', 'good', 'fair', 'poor', 'new', 'used', 'damaged', 'worn'];
  conditions.forEach(condition => {
    if (lowerAnalysis.includes(condition)) {
      tags.push(condition);
    }
  });

  // Type-specific tags
  if (listingType === 'vehicle') {
    const vehicleTags = ['car', 'truck', 'suv', 'sedan', 'hatchback', 'motorcycle', 'bicycle', 
                        'manual', 'automatic', 'diesel', 'petrol', 'electric', 'hybrid',
                        'leather', 'cloth', 'sunroof', 'ac', 'power steering'];
    vehicleTags.forEach(tag => {
      if (lowerAnalysis.includes(tag)) {
        tags.push(tag);
      }
    });
  } else if (listingType === 'property') {
    const propertyTags = ['house', 'apartment', 'flat', 'villa', 'bungalow', 'furnished', 
                         'unfurnished', 'garden', 'parking', 'balcony', 'terrace', 'pool'];
    propertyTags.forEach(tag => {
      if (lowerAnalysis.includes(tag)) {
        tags.push(tag);
      }
    });
  } else if (listingType === 'product') {
    const productTags = ['electronics', 'furniture', 'clothing', 'books', 'toys', 'sports',
                        'boxed', 'sealed', 'unopened', 'complete', 'missing parts'];
    productTags.forEach(tag => {
      if (lowerAnalysis.includes(tag)) {
        tags.push(tag);
      }
    });
  }

  // Image quality tags
  if (lowerAnalysis.includes('clear') || lowerAnalysis.includes('high quality')) {
    tags.push('high-quality-image');
  }
  if (lowerAnalysis.includes('blurry') || lowerAnalysis.includes('poor quality')) {
    tags.push('poor-quality-image');
  }

  return [...new Set(tags)]; // Remove duplicates
}

function assessImageQuality(analysis: string): number {
  let score = 5; // Base score

  const lowerAnalysis = analysis.toLowerCase();

  // Positive indicators
  if (lowerAnalysis.includes('clear') || lowerAnalysis.includes('sharp')) score += 2;
  if (lowerAnalysis.includes('well lit') || lowerAnalysis.includes('good lighting')) score += 1;
  if (lowerAnalysis.includes('high quality') || lowerAnalysis.includes('professional')) score += 2;
  if (lowerAnalysis.includes('detailed') || lowerAnalysis.includes('comprehensive')) score += 1;

  // Negative indicators
  if (lowerAnalysis.includes('blurry') || lowerAnalysis.includes('unclear')) score -= 2;
  if (lowerAnalysis.includes('dark') || lowerAnalysis.includes('poor lighting')) score -= 1;
  if (lowerAnalysis.includes('low quality') || lowerAnalysis.includes('pixelated')) score -= 2;
  if (lowerAnalysis.includes('distant') || lowerAnalysis.includes('far away')) score -= 1;

  // Ensure score is within 1-10 range
  return Math.max(1, Math.min(10, score));
}

function extractCondition(analysis: string): string {
  const lowerAnalysis = analysis.toLowerCase();
  
  if (lowerAnalysis.includes('excellent') || lowerAnalysis.includes('pristine') || lowerAnalysis.includes('perfect')) {
    return 'excellent';
  } else if (lowerAnalysis.includes('good') && !lowerAnalysis.includes('not good')) {
    return 'good';
  } else if (lowerAnalysis.includes('fair') || lowerAnalysis.includes('average') || lowerAnalysis.includes('decent')) {
    return 'fair';
  } else if (lowerAnalysis.includes('poor') || lowerAnalysis.includes('bad') || lowerAnalysis.includes('damaged')) {
    return 'poor';
  } else if (lowerAnalysis.includes('new') || lowerAnalysis.includes('unused')) {
    return 'new';
  }
  
  return 'unknown';
}

async function updateListingTags(supabase: any, listingId: string, listingType: string, tags: string[], qualityScore: number, condition: string) {
  try {
    // Update the appropriate table based on listing type
    let tableName = 'products'; // default
    
    if (listingType === 'vehicle') tableName = 'vehicles';
    else if (listingType === 'property') tableName = 'properties';
    else if (listingType === 'produce') tableName = 'produce_listings';

    const updateData: any = {
      auto_tags: tags,
      image_quality_score: qualityScore,
      condition_assessment: condition,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', listingId);

    if (error) {
      console.error(`Error updating ${tableName}:`, error);
    } else {
      console.log(`Successfully updated ${tableName} with auto-tags`);
    }
  } catch (error) {
    console.error('Error in updateListingTags:', error);
  }
}
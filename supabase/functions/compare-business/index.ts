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
    const { businessName, phoneNumber, address } = await req.json();

    if (!businessName && !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'businessName or phoneNumber is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Search for similar businesses
    let query = supabase
      .from('businesses')
      .select('*');

    // Exact phone match has highest priority
    if (phoneNumber) {
      const { data: phoneMatches } = await query
        .or(`phone_number.eq.${phoneNumber},whatsapp_number.eq.${phoneNumber}`)
        .limit(5);

      if (phoneMatches && phoneMatches.length > 0) {
        return new Response(
          JSON.stringify({
            matches: phoneMatches,
            matchType: 'phone_exact',
            confidence: 0.95
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fuzzy name matching if no phone match
    if (businessName) {
      const normalizedName = businessName.toLowerCase().trim();
      
      const { data: nameMatches } = await supabase
        .from('businesses')
        .select('*')
        .ilike('name', `%${normalizedName}%`)
        .limit(10);

      if (nameMatches && nameMatches.length > 0) {
        // Calculate similarity scores
        const scoredMatches = nameMatches.map(business => {
          const businessNameLower = business.name.toLowerCase();
          const similarity = calculateSimilarity(normalizedName, businessNameLower);
          
          return {
            ...business,
            similarity_score: similarity
          };
        }).filter(match => match.similarity_score > 0.6)
          .sort((a, b) => b.similarity_score - a.similarity_score);

        if (scoredMatches.length > 0) {
          return new Response(
            JSON.stringify({
              matches: scoredMatches,
              matchType: 'name_fuzzy',
              confidence: scoredMatches[0].similarity_score
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // No matches found
    return new Response(
      JSON.stringify({
        matches: [],
        matchType: 'none',
        confidence: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in compare-business function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple string similarity calculation using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  // Initialize matrix
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return (maxLen - distance) / maxLen;
}

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input, sessionId } = await req.json();
    
    if (!input || input.length < 2) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get recent phone numbers from database
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: recentPhones } = await supabase
      .from('payments')
      .select('phone_number')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: qrPhones } = await supabase
      .from('qr_history')
      .select('phone_number')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Combine and get unique phone numbers with frequency
    const allPhones = [...(recentPhones || []), ...(qrPhones || [])];
    const phoneFrequency = new Map();
    
    allPhones.forEach(({ phone_number }) => {
      if (phone_number) {
        phoneFrequency.set(phone_number, (phoneFrequency.get(phone_number) || 0) + 1);
      }
    });

    const frequentPhones = Array.from(phoneFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phone]) => phone);

    if (!openAIApiKey) {
      // Fallback to simple matching if no OpenAI key
      const suggestions = frequentPhones
        .filter(phone => phone.includes(input))
        .slice(0, 3);
      
      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use OpenAI for intelligent suggestions
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are an intelligent phone number suggestion system for a mobile money app in Rwanda. 
            
            Rules:
            - Rwanda phone numbers follow format: 07XXXXXXXX (10 digits total)
            - Agent codes are 4-6 digits
            - Prioritize frequently used numbers
            - Match partial input intelligently
            - Return only valid, complete numbers or codes
            - Maximum 3 suggestions
            - Return JSON array of strings only`
          },
          {
            role: 'user',
            content: `User typed: "${input}"
            
            Frequent numbers: ${JSON.stringify(frequentPhones)}
            
            Suggest up to 3 phone numbers or codes that match the input. Consider:
            1. Exact matches first
            2. Partial matches from frequent numbers
            3. Smart completion based on Rwanda phone patterns
            
            Return only a JSON array of suggested numbers/codes.`
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    const aiData = await response.json();
    let suggestions = [];
    
    try {
      const content = aiData.choices[0].message.content;
      suggestions = JSON.parse(content);
      
      // Ensure suggestions are strings and filter valid ones
      suggestions = suggestions
        .filter((s: any) => typeof s === 'string')
        .filter((s: string) => {
          // Valid Rwanda phone or agent code
          return /^07[2-9][0-9]{7}$/.test(s) || /^[0-9]{4,6}$/.test(s);
        })
        .slice(0, 3);
        
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fallback to simple matching
      suggestions = frequentPhones
        .filter(phone => phone.includes(input))
        .slice(0, 3);
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-phone-suggestions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestions: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

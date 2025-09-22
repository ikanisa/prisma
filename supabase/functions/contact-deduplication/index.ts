import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting contact deduplication process...');

    // Normalize phone numbers and find duplicates
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select('id, phone_number, name, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch contacts: ${fetchError.message}`);
    }

    const phoneMap = new Map();
    const duplicates = [];

    for (const contact of contacts) {
      // Normalize phone number (remove spaces, +, country codes)
      const normalized = contact.phone_number
        .replace(/[\s\-\+]/g, '')
        .replace(/^(250|0)/, ''); // Remove Rwanda country code

      if (phoneMap.has(normalized)) {
        duplicates.push({
          keepId: phoneMap.get(normalized).id,
          removeId: contact.id,
          normalizedPhone: normalized
        });
      } else {
        phoneMap.set(normalized, contact);
      }
    }

    console.log(`Found ${duplicates.length} duplicate contacts`);

    let mergedCount = 0;
    for (const duplicate of duplicates) {
      // Update conversation references to point to the kept contact
      await supabase
        .from('conversations')
        .update({ contact_id: duplicate.keepId })
        .eq('contact_id', duplicate.removeId);

      // Delete the duplicate contact
      await supabase
        .from('contacts')
        .delete()
        .eq('id', duplicate.removeId);

      mergedCount++;
    }

    // Update contact interaction counts
    const { error: updateError } = await supabase.rpc('refresh_contact_stats');
    
    if (updateError) {
      console.warn('Failed to refresh contact stats:', updateError.message);
    }

    console.log(`Successfully merged ${mergedCount} duplicate contacts`);

    return new Response(
      JSON.stringify({
        success: true,
        duplicatesFound: duplicates.length,
        contactsMerged: mergedCount,
        message: 'Contact deduplication completed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in contact deduplication:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('📋 Getting unique phone numbers from incoming_messages...');

    // Get unique phone numbers from incoming_messages
    const { data: phoneNumbers, error: fetchError } = await supabase
      .from('incoming_messages')
      .select('from_number')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch phone numbers: ${fetchError.message}`);
    }

    // Get unique phone numbers
    const uniquePhones = [...new Set(phoneNumbers?.map(item => item.from_number) || [])];
    console.log(`📱 Found ${uniquePhones.length} unique phone numbers`);

    let createdCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    // Process each phone number
    for (const phone of uniquePhones) {
      try {
        console.log(`🔄 Processing phone: ${phone}`);
        
        // Call ensure-user-exists function
        const { data: result, error: ensureError } = await supabase.functions.invoke('ensure-user-exists', {
          body: { phone: phone, contact_name: 'WhatsApp User' }
        });

        if (ensureError) {
          console.error(`❌ Error for ${phone}:`, ensureError);
          errorCount++;
          continue;
        }

        if (result?.is_new_user) {
          createdCount++;
          console.log(`✅ Created user for ${phone}`);
        } else {
          existingCount++;
          console.log(`👤 User already exists for ${phone}`);
        }
      } catch (error) {
        console.error(`❌ Failed to process ${phone}:`, error);
        errorCount++;
      }
    }

    console.log(`📊 Migration complete: ${createdCount} created, ${existingCount} existing, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: uniquePhones.length,
        created: createdCount,
        existing: existingCount,
        errors: errorCount,
        phone_numbers: uniquePhones
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, source = 'manual' } = await req.json();
    
    if (!contacts || !Array.isArray(contacts)) {
      throw new Error('Contacts array is required');
    }

    console.log(`📋 Importing ${contacts.length} contacts from ${source}`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const contactData of contacts) {
      try {
        const { phone_number, name, location, category, business_name } = contactData;
        
        if (!phone_number) {
          errors.push(`Contact missing phone number: ${JSON.stringify(contactData)}`);
          continue;
        }

        // Check if contact already exists
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone_number', phone_number)
          .single();

        if (existingContact) {
          skippedCount++;
          continue;
        }

        // Create new contact
        const { error: insertError } = await supabase
          .from('contacts')
          .insert({
            phone_number,
            name: name || null,
            location: location || null,
            contact_type: 'prospect',
            preferred_channel: 'whatsapp',
            conversion_status: 'prospect'
          });

        if (insertError) {
          errors.push(`Failed to insert ${phone_number}: ${insertError.message}`);
          continue;
        }

        // If business contact, also create user_contacts entry
        if (business_name || category) {
          await supabase
            .from('user_contacts')
            .insert({
              phone: phone_number,
              name: name || null,
              business_name: business_name || null,
              location: location || null,
              category: category || null,
              source: source
            });
        }

        importedCount++;
        
      } catch (error) {
        errors.push(`Error processing contact: ${error.message}`);
      }
    }

    console.log(`✅ Import complete: ${importedCount} imported, ${skippedCount} skipped`);

    return new Response(JSON.stringify({
      success: true,
      imported_count: importedCount,
      skipped_count: skippedCount,
      total_processed: contacts.length,
      errors: errors.length > 0 ? errors : null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Contact import error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
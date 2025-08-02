import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse, withRetry } from "../_shared/utils.ts";
import { validateRequiredEnvVars, validateRequestBody, sanitizeInput } from "../_shared/validation.ts";
import { getSupabaseClient, withSupabase } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { PerformanceMonitor } from "../_shared/performance.ts";

// Validate environment variables
validateRequiredEnvVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const perf = new PerformanceMonitor('import-contacts');

  try {
    const requestData = await req.json();
    
    // Validate request body
    const validation = validateRequestBody(requestData, {
      contacts: { required: true, type: 'array' },
      source: { type: 'string', enum: ['manual', 'csv', 'api', 'whatsapp'] }
    });

    if (!validation.isValid) {
      logger.warn('Invalid import request', { errors: validation.errors, requestData });
      return createErrorResponse('Validation failed', { errors: validation.errors });
    }

    const { contacts, source = 'manual' } = requestData;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return createErrorResponse('Contacts array is required and cannot be empty');
    }

    logger.info('Starting contact import', { count: contacts.length, source });

    return withSupabase(async (supabase) => {
      let importedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Process contacts in batches for better performance
      const batchSize = 50;
      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (contactData) => {
          try {
            const { phone_number, name, location, category, business_name } = contactData;
            
            if (!phone_number) {
              errors.push(`Contact missing phone number: ${JSON.stringify(contactData)}`);
              return;
            }

            // Sanitize inputs
            const sanitizedPhone = sanitizeInput(phone_number);
            const sanitizedName = name ? sanitizeInput(name) : null;
            const sanitizedLocation = location ? sanitizeInput(location) : null;

            // Check if contact already exists with retry
            const existingContact = await withRetry(async () => {
              const { data } = await supabase
                .from('contacts')
                .select('id')
                .eq('phone_number', sanitizedPhone)
                .maybeSingle();
              return data;
            }, 3, 1000, 'check-existing-contact');

            if (existingContact) {
              skippedCount++;
              return;
            }

            // Create new contact
            const { error: insertError } = await supabase
              .from('contacts')
              .insert({
                phone_number: sanitizedPhone,
                name: sanitizedName,
                location: sanitizedLocation,
                contact_type: 'prospect',
                preferred_channel: 'whatsapp',
                conversion_status: 'prospect'
              });

            if (insertError) {
              errors.push(`Failed to insert ${sanitizedPhone}: ${insertError.message}`);
              return;
            }

            // If business contact, also create user_contacts entry
            if (business_name || category) {
              await supabase
                .from('user_contacts')
                .insert({
                  phone: sanitizedPhone,
                  name: sanitizedName,
                  business_name: business_name || null,
                  location: sanitizedLocation,
                  category: category || null,
                  source: source
                });
            }

            importedCount++;
            
          } catch (error) {
            errors.push(`Error processing contact: ${error.message}`);
          }
        }));
      }

      logger.info('Import complete', { importedCount, skippedCount, totalProcessed: contacts.length });

      return createSuccessResponse({
        imported_count: importedCount,
        skipped_count: skippedCount,
        total_processed: contacts.length,
        errors: errors.length > 0 ? errors : null
      });
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
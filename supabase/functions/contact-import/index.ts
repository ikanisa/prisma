import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseClient, withSupabase } from "../_shared/supabase.ts";

interface ImportContact {
  phone_number: string;
  name?: string;
  contact_type?: string;
  location?: string;
  tags?: string[];
}

interface ImportResult {
  total_processed: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'import_csv':
        return await importFromCSV(payload);
      case 'import_json':
        return await importFromJSON(payload);
      case 'validate_data':
        return await validateImportData(payload);
      case 'get_import_template':
        return await getImportTemplate();
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('Contact Import error:', error);
    
    await withSupabase(async (client) => {
      await client.from('agent_execution_log').insert({
        function_name: 'contact-import',
        input_data: { error: error.message },
        success_status: false,
        error_details: error.message,
        execution_time_ms: 0
      });
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function importFromCSV(payload: { csv_data: string; sync_run_id?: string }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { csv_data, sync_run_id } = payload;
    
    // Parse CSV data
    const lines = csv_data.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Validate headers
    const requiredHeaders = ['phone_number'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    const contacts: ImportContact[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        const contact: ImportContact = {
          phone_number: '',
        };

        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch (header) {
            case 'phone_number':
              contact.phone_number = value;
              break;
            case 'name':
              contact.name = value;
              break;
            case 'contact_type':
              contact.contact_type = value;
              break;
            case 'location':
              contact.location = value;
              break;
            case 'tags':
              contact.tags = value ? value.split(';').map(t => t.trim()) : [];
              break;
          }
        });

        // Validate required fields
        if (!contact.phone_number) {
          errors.push({ row: i + 1, error: 'Phone number is required', data: contact });
          continue;
        }

        // Normalize phone number (basic validation)
        contact.phone_number = normalizePhoneNumber(contact.phone_number);
        
        contacts.push(contact);
      } catch (error) {
        errors.push({ row: i + 1, error: error.message, data: lines[i] });
      }
    }

    // Import valid contacts
    const result = await processContactImport(client, contacts, sync_run_id);
    result.errors = errors;

    const executionTime = Date.now() - startTime;

    // Log execution
    await client.from('agent_execution_log').insert({
      function_name: 'contact-import',
      input_data: { total_rows: lines.length - 1, valid_contacts: contacts.length },
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function importFromJSON(payload: { contacts: ImportContact[]; sync_run_id?: string }) {
  const startTime = Date.now();
  
  return await withSupabase(async (client) => {
    const { contacts, sync_run_id } = payload;
    
    // Validate and normalize contacts
    const validContacts: ImportContact[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];

    contacts.forEach((contact, index) => {
      try {
        if (!contact.phone_number) {
          errors.push({ row: index + 1, error: 'Phone number is required', data: contact });
          return;
        }

        contact.phone_number = normalizePhoneNumber(contact.phone_number);
        validContacts.push(contact);
      } catch (error) {
        errors.push({ row: index + 1, error: error.message, data: contact });
      }
    });

    // Import valid contacts
    const result = await processContactImport(client, validContacts, sync_run_id);
    result.errors = errors;

    const executionTime = Date.now() - startTime;

    // Log execution
    await client.from('agent_execution_log').insert({
      function_name: 'contact-import',
      input_data: { total_contacts: contacts.length, valid_contacts: validContacts.length },
      success_status: true,
      execution_time_ms: executionTime
    });

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  });
}

async function processContactImport(
  client: any,
  contacts: ImportContact[],
  syncRunId?: string
): Promise<ImportResult> {
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  // Create sync run record if provided
  if (syncRunId) {
    await client.from('sync_runs').insert({
      id: syncRunId,
      sync_type: 'contact_import',
      status: 'running',
      metadata: { total_contacts: contacts.length }
    });
  }

  // Process in batches of 100
  const batchSize = 100;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    // Check for existing contacts
    const phoneNumbers = batch.map(c => c.phone_number);
    const { data: existing } = await client
      .from('contacts')
      .select('phone_number, id')
      .in('phone_number', phoneNumbers)
      .is('deleted_at', null);

    const existingPhones = new Set(existing?.map(c => c.phone_number) || []);

    // Separate new contacts from existing
    const newContacts = batch.filter(c => !existingPhones.has(c.phone_number));
    const updateContacts = batch.filter(c => existingPhones.has(c.phone_number));

    // Insert new contacts
    if (newContacts.length > 0) {
      const { data: insertedData } = await client
        .from('contacts')
        .insert(newContacts.map(c => ({
          phone_number: c.phone_number,
          name: c.name,
          contact_type: c.contact_type || 'prospect',
          location: c.location,
          first_contact_date: new Date().toISOString()
        })))
        .select();

      imported += insertedData?.length || 0;

      // Also create wa_contacts entries
      if (insertedData && insertedData.length > 0) {
        await client
          .from('wa_contacts')
          .insert(insertedData.map(contact => ({
            wa_id: contact.phone_number,
            display_name: contact.name,
            tags: newContacts.find(c => c.phone_number === contact.phone_number)?.tags || []
          })));
      }
    }

    // Update existing contacts
    for (const contact of updateContacts) {
      const existingContact = existing?.find(e => e.phone_number === contact.phone_number);
      if (existingContact) {
        await client
          .from('contacts')
          .update({
            name: contact.name,
            location: contact.location,
            last_interaction: new Date().toISOString()
          })
          .eq('id', existingContact.id);

        // Update wa_contacts tags
        await client
          .from('wa_contacts')
          .upsert({
            wa_id: contact.phone_number,
            display_name: contact.name,
            tags: contact.tags || []
          });

        updated++;
      }
    }
  }

  skipped = contacts.length - imported - updated;

  // Update sync run if provided
  if (syncRunId) {
    await client.from('sync_runs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      rows_added: imported,
      rows_updated: updated
    }).eq('id', syncRunId);
  }

  return {
    total_processed: contacts.length,
    imported,
    updated,
    skipped,
    errors: []
  };
}

async function validateImportData(payload: { contacts: ImportContact[] }) {
  const errors: Array<{ row: number; error: string; data: any }> = [];
  let validCount = 0;

  payload.contacts.forEach((contact, index) => {
    try {
      if (!contact.phone_number) {
        errors.push({ row: index + 1, error: 'Phone number is required', data: contact });
        return;
      }

      normalizePhoneNumber(contact.phone_number);
      validCount++;
    } catch (error) {
      errors.push({ row: index + 1, error: error.message, data: contact });
    }
  });

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        total: payload.contacts.length,
        valid: validCount,
        invalid: errors.length,
        errors: errors.slice(0, 10) // Return first 10 errors
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getImportTemplate() {
  const template = {
    csv_headers: 'phone_number,name,contact_type,location,tags',
    csv_example: '+250781234567,John Doe,customer,Kigali,vip;frequent',
    json_example: {
      phone_number: '+250781234567',
      name: 'John Doe',
      contact_type: 'customer',
      location: 'Kigali',
      tags: ['vip', 'frequent']
    },
    contact_types: ['prospect', 'customer', 'driver', 'farmer', 'vendor'],
    instructions: [
      'Phone number is required and should include country code',
      'Tags should be separated by semicolons in CSV',
      'Contact type defaults to "prospect" if not specified'
    ]
  };

  return new Response(
    JSON.stringify({ success: true, data: template }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 0, replace with +250 (Rwanda)
  if (normalized.startsWith('0')) {
    normalized = '+250' + normalized.substring(1);
  }
  
  // If it doesn't start with +, add +250
  if (!normalized.startsWith('+')) {
    normalized = '+250' + normalized;
  }
  
  // Validate basic format
  if (normalized.length < 10 || normalized.length > 15) {
    throw new Error(`Invalid phone number format: ${phone}`);
  }
  
  return normalized;
}
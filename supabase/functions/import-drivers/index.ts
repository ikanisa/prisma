import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { getSupabaseClient } from '../_shared/supabase.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_path } = await req.json();
    const sb = getSupabaseClient();

    if (!file_path) {
      return new Response(
        JSON.stringify({ error: 'file_path is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Importing drivers from CSV: ${file_path}`);

    // Download the CSV file from Supabase Storage
    const { data: fileData, error: downloadError } = await sb.storage
      .from('data-imports')
      .download(file_path);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      return new Response(
        JSON.stringify({ error: `Failed to download file: ${downloadError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse CSV content
    const csvText = await fileData.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: 'CSV file must have headers and at least one data row' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const drivers = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const driver: any = {};
      
      headers.forEach((header, index) => {
        driver[header] = values[index] || null;
      });

      // Validate required fields
      if (driver.phone) {
        drivers.push({
          phone: driver.phone,
          name: driver.name || null,
          email: driver.email || null,
          vehicle_type: driver.vehicle_type || null,
          license_number: driver.license_number || null,
          status: driver.status || 'pending'
        });
      }
    }

    console.log(`Parsed ${drivers.length} valid driver records`);

    if (drivers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid driver records found in CSV' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert drivers into the database
    const { error: insertError } = await sb
      .from('drivers')
      .upsert(drivers, { onConflict: 'phone' });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return new Response(
        JSON.stringify({ error: `Database error: ${insertError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: drivers.length,
        message: `Successfully imported ${drivers.length} drivers`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in import-drivers:', error);
    return new Response(
      JSON.stringify({ error: `Server error: ${error.message}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
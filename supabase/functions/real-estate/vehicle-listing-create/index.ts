import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { from, text, message_id, contact_name, timestamp } = await req.json();

    // Log execution start
    const executionStart = Date.now();
    
    console.log(`🚗 Vehicle listing creation requested from ${from}: "${text}"`);

    // Parse vehicle details using OpenAI
    const vehicleDetails = await parseVehicleDetails(text);
    
    if (!vehicleDetails) {
      await sendWhatsAppMessage(from, "I couldn't understand your vehicle listing. Please provide details like: Make, Model, Year, Price, and Condition. Example: 'Toyota Corolla 2018, $8000, excellent condition'");
      return new Response(JSON.stringify({ success: true, message: "Invalid format response sent" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get or create vendor
    let vendor = await getOrCreateVendor(supabase, from, contact_name);

    // Create vehicle listing
    const { data: vehicleData, error: vehicleError } = await supabase
      .from('tbl_vehicles')
      .insert({
        title: `${vehicleDetails.make} ${vehicleDetails.model} ${vehicleDetails.year}`,
        make: vehicleDetails.make,
        model: vehicleDetails.model,
        year: vehicleDetails.year,
        action: vehicleDetails.action || 'sale',
        price: vehicleDetails.price,
        condition_status: vehicleDetails.condition,
        description: vehicleDetails.description || text,
        owner_phone: from,
        vendor_id: vendor.id,
        contact_whatsapp: from,
        status: 'active',
        source: 'whatsapp',
        mileage: vehicleDetails.mileage,
        fuel_type: vehicleDetails.fuel_type,
        transmission: vehicleDetails.transmission,
        color: vehicleDetails.color,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (vehicleError) {
      console.error('Vehicle creation error:', vehicleError);
      await sendWhatsAppMessage(from, "❌ Sorry, I couldn't create your vehicle listing. Please try again or contact support.");
      throw vehicleError;
    }

    // Create wa_contact entry
    await supabase
      .from('wa_contacts')
      .upsert({
        wa_id: from,
        display_name: contact_name,
        business_name: vendor.name,
        last_seen: new Date().toISOString(),
        tags: ['vehicle_seller']
      }, { onConflict: 'wa_id' });

    // Store in agent memory
    await supabase
      .from('agent_memory')
      .upsert({
        user_id: from,
        memory_type: 'user_type',
        memory_value: 'vehicle_seller'
      }, { onConflict: 'user_id,memory_type' });

    await supabase
      .from('agent_memory')
      .upsert({
        user_id: from,
        memory_type: 'recent_listing',
        memory_value: vehicleData.id
      }, { onConflict: 'user_id,memory_type' });

    // Generate success message
    const confirmationMessage = `✅ Vehicle listing created successfully!

🚗 ${vehicleData.title}
💰 Price: ${vehicleDetails.price ? `$${vehicleDetails.price}` : 'Contact for price'}
📅 Year: ${vehicleDetails.year}
🏷️ Condition: ${vehicleDetails.condition || 'Not specified'}
📱 Contact: ${from}

Your listing ID: ${vehicleData.id.slice(0, 8)}

Need to add photos? Send them as images and I'll attach them to your listing.
Want to edit? Reply with "edit vehicle ${vehicleData.id.slice(0, 8)}"`;

    await sendWhatsAppMessage(from, confirmationMessage);

    // Log successful execution
    const executionTime = Date.now() - executionStart;
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'vehicle-listing-create',
        user_id: from,
        input_data: { text, vehicle_details: vehicleDetails },
        execution_time_ms: executionTime,
        success_status: true,
        model_used: 'gpt-4o-mini',
        timestamp: new Date().toISOString()
      });

    return new Response(JSON.stringify({ 
      success: true, 
      vehicle_id: vehicleData.id,
      vendor_id: vendor.id,
      message: "Vehicle listing created successfully"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Vehicle listing creation error:', error);
    
    // Log failed execution
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabase
      .from('agent_execution_log')
      .insert({
        function_name: 'vehicle-listing-create',
        user_id: (await req.json()).from || 'unknown',
        input_data: await req.json(),
        execution_time_ms: 0,
        success_status: false,
        error_details: error.message,
        timestamp: new Date().toISOString()
      });

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function parseVehicleDetails(text: string) {
  if (!openAIApiKey) {
    // Fallback parsing without AI
    return parseVehicleDetailsFallback(text);
  }

  try {
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
            content: `Extract vehicle listing details from user messages. Return JSON with these fields:
            - make (string): Vehicle manufacturer (Toyota, Honda, etc.)
            - model (string): Vehicle model (Corolla, Civic, etc.)
            - year (number): Manufacturing year
            - price (number): Price in USD (convert from RWF if needed: 1 USD = 1300 RWF)
            - condition (string): excellent/good/fair/poor
            - action (string): sale/rent
            - description (string): Full description
            - mileage (number): Kilometers driven
            - fuel_type (string): petrol/diesel/hybrid/electric
            - transmission (string): manual/automatic
            - color (string): Vehicle color
            
            If information is missing, set to null. Be smart about extracting details.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch {
      return parseVehicleDetailsFallback(text);
    }
  } catch (error) {
    console.error('OpenAI parsing error:', error);
    return parseVehicleDetailsFallback(text);
  }
}

function parseVehicleDetailsFallback(text: string): any {
  const lower = text.toLowerCase();
  
  // Extract basic info using regex
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const priceMatch = text.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  
  // Common makes
  const makes = ['toyota', 'honda', 'nissan', 'volkswagen', 'hyundai', 'kia', 'mazda', 'subaru', 'mitsubishi'];
  const foundMake = makes.find(make => lower.includes(make));
  
  return {
    make: foundMake || null,
    model: null, // Hard to extract without AI
    year: yearMatch ? parseInt(yearMatch[0]) : null,
    price: priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null,
    condition: lower.includes('excellent') ? 'excellent' : 
               lower.includes('good') ? 'good' :
               lower.includes('fair') ? 'fair' :
               lower.includes('poor') ? 'poor' : null,
    action: lower.includes('rent') ? 'rent' : 'sale',
    description: text,
    mileage: null,
    fuel_type: lower.includes('diesel') ? 'diesel' : 
               lower.includes('petrol') || lower.includes('gasoline') ? 'petrol' : null,
    transmission: lower.includes('automatic') ? 'automatic' : 
                  lower.includes('manual') ? 'manual' : null,
    color: null
  };
}

async function getOrCreateVendor(supabase: any, phone: string, name: string) {
  // First try to find existing vendor
  const { data: existingVendor } = await supabase
    .from('vendors')
    .select('*')
    .eq('whatsapp', phone)
    .eq('category', 'vehicle_rental')
    .single();

  if (existingVendor) {
    return existingVendor;
  }

  // Create new vendor
  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      name: name || `Vehicle Seller ${phone.slice(-4)}`,
      category: 'vehicle_rental',
      whatsapp: phone,
      status: 'active',
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return vendor;
}

async function sendWhatsAppMessage(to: string, message: string) {
  if (!whatsappToken || !whatsappPhoneNumberId) {
    console.log('WhatsApp not configured, would send:', message);
    return;
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
  }
}
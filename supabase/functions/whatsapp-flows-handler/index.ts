import { supabaseClient } from "./client.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlowSubmission {
  flow_id: string;
  phone_number: string;
  submission_data: Record<string, any>;
  flow_token?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action } = await req.json();

    switch (action) {
      case 'submit':
        return await handleFlowSubmission(supabase, await req.json());
      
      case 'get_flow':
        const { flow_id } = await req.json();
        return await getFlowDefinition(supabase, flow_id);
      
      case 'list_flows':
        const { domain } = await req.json();
        return await listFlows(supabase, domain);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in flows handler:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleFlowSubmission(supabase: any, submission: FlowSubmission) {
  const { flow_id, phone_number, submission_data } = submission;

  console.log(`Processing flow submission for flow ${flow_id} from ${phone_number}`);

  // Get flow definition
  const { data: flow } = await supabase
    .from('whatsapp_flows')
    .select(`
      *,
      whatsapp_flow_steps (
        *,
        whatsapp_flow_fields (*)
      )
    `)
    .eq('id', flow_id)
    .single();

  if (!flow) {
    throw new Error('Flow not found');
  }

  // Validate submission data
  const validationResult = validateFlowSubmission(flow, submission_data);
  if (!validationResult.valid) {
    return new Response(JSON.stringify({ 
      error: 'Validation failed',
      details: validationResult.errors 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Process based on flow domain
  let result;
  switch (flow.domain) {
    case 'payments':
      result = await processPaymentFlow(supabase, flow, phone_number, submission_data);
      break;
    
    case 'mobility':
      result = await processMobilityFlow(supabase, flow, phone_number, submission_data);
      break;
    
    case 'listings':
      result = await processListingFlow(supabase, flow, phone_number, submission_data);
      break;
    
    default:
      result = await processGenericFlow(supabase, flow, phone_number, submission_data);
  }

  return new Response(JSON.stringify({ 
    success: true,
    result 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processPaymentFlow(supabase: any, flow: any, phone_number: string, data: any) {
  console.log('Processing payment flow:', flow.code);
  
  if (flow.code === 'FLOW_GET_PAID') {
    // Generate QR code for payment
    const amount = data.amount || null;
    const momo_number = data.momo_number || phone_number;
    
    // Call QR generation function
    const { data: qrResult } = await supabase.functions.invoke('qr-payment-generator', {
      body: { 
        action: 'generate',
        amount,
        phone: momo_number,
        type: 'receive'
      }
    });

    return {
      type: 'payment_qr',
      qr_url: qrResult?.qr_url,
      payment_link: qrResult?.payment_link,
      amount,
      momo_number
    };
  }

  return { type: 'payment_processed', data };
}

async function processMobilityFlow(supabase: any, flow: any, phone_number: string, data: any) {
  console.log('Processing mobility flow:', flow.code);
  
  // Create trip request or booking
  if (flow.code === 'FLOW_BOOK_TRIP') {
    const { pickup_location, dropoff_location, passenger_count } = data;
    
    // Create passenger intent
    const { data: intent } = await supabase
      .from('passenger_intents_spatial')
      .insert({
        passenger_phone: phone_number,
        pickup_location,
        dropoff_location,
        passenger_count: passenger_count || 1,
        status: 'searching'
      })
      .select()
      .single();

    return {
      type: 'trip_request',
      intent_id: intent.id,
      status: 'searching_drivers'
    };
  }

  return { type: 'mobility_processed', data };
}

async function processListingFlow(supabase: any, flow: any, phone_number: string, data: any) {
  console.log('Processing listing flow:', flow.code);
  
  // Create property or vehicle listing
  const { title, description, price, category, location } = data;
  
  const listing = {
    seller_phone: phone_number,
    title,
    description,
    price: price ? parseFloat(price) : null,
    category,
    location,
    status: 'draft'
  };

  let result;
  if (category === 'vehicle') {
    const { data: vehicle } = await supabase
      .from('vehicle_listings')
      .insert(listing)
      .select()
      .single();
    
    result = { type: 'vehicle_listing', listing: vehicle };
  } else {
    const { data: property } = await supabase
      .from('property_listings')
      .insert(listing)
      .select()
      .single();
    
    result = { type: 'property_listing', listing: property };
  }

  return result;
}

async function processGenericFlow(supabase: any, flow: any, phone_number: string, data: any) {
  console.log('Processing generic flow:', flow.code);
  
  // Store in conversation flows table
  await supabase
    .from('conversation_flows')
    .insert({
      phone_number,
      flow_name: flow.code,
      current_step: 'completed',
      status: 'completed',
      flow_data: data,
      completed_at: new Date().toISOString()
    });

  return { type: 'generic_processed', data };
}

function validateFlowSubmission(flow: any, data: any) {
  const errors: string[] = [];
  
  // Get all required fields across all steps
  const requiredFields = flow.whatsapp_flow_steps
    .flatMap((step: any) => step.whatsapp_flow_fields)
    .filter((field: any) => field.required);

  // Check required fields
  for (const field of requiredFields) {
    if (!data[field.field_key] || data[field.field_key].toString().trim() === '') {
      errors.push(`Field '${field.label}' is required`);
    }
  }

  // Validate field formats
  for (const step of flow.whatsapp_flow_steps) {
    for (const field of step.whatsapp_flow_fields) {
      const value = data[field.field_key];
      if (value && field.validation_regex) {
        const regex = new RegExp(field.validation_regex);
        if (!regex.test(value.toString())) {
          errors.push(`Field '${field.label}' has invalid format`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function getFlowDefinition(supabase: any, flow_id: string) {
  const { data: flow } = await supabase
    .from('whatsapp_flows')
    .select(`
      *,
      whatsapp_flow_steps (
        *,
        whatsapp_flow_fields (*)
      )
    `)
    .eq('id', flow_id)
    .single();

  return new Response(JSON.stringify({ flow }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function listFlows(supabase: any, domain?: string) {
  let query = supabase
    .from('whatsapp_flows')
    .select('*')
    .eq('status', 'APPROVED');

  if (domain) {
    query = query.eq('domain', domain);
  }

  const { data: flows } = await query;

  return new Response(JSON.stringify({ flows }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
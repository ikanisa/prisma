import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrationRequest {
  action: string;
  phone?: string;
  eventType?: string;
  eventData?: any;
  campaignType?: string;
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      action, 
      phone, 
      eventType, 
      eventData = {},
      campaignType = 'general'
    }: IntegrationRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log(`🔗 Marketing integration: ${action} for ${phone || 'system'}`);

    let result;

    switch (action) {
      case 'trigger_marketing':
        result = await triggerMarketing(supabase, phone!, campaignType, eventType, eventData);
        break;
      
      case 'collect_csat':
        result = await collectCSAT(supabase, eventData);
        break;
      
      case 'update_segment':
        result = await updateUserSegment(supabase, phone!, eventData);
        break;
      
      case 'opt_out':
        result = await optOutUser(supabase, phone!, eventData.reason);
        break;
      
      case 'reset_frequency':
        result = await resetFrequencyLimits(supabase, phone!, campaignType);
        break;
      
      case 'get_marketing_status':
        result = await getMarketingStatus(supabase, phone!);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      action: action,
      result: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Marketing integration error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function triggerMarketing(
  supabase: any, 
  phone: string, 
  campaignType: string, 
  eventType?: string,
  eventData?: any
) {
  // Call the marketing template strategy
  const { data, error } = await supabase.functions.invoke('marketing-template-strategy', {
    body: {
      phone: phone,
      campaignType: campaignType,
      triggerEvent: eventType,
      userContext: eventData
    }
  });

  if (error) {
    throw new Error(`Marketing strategy failed: ${error.message}`);
  }

  return {
    shouldSend: data.shouldSend,
    reason: data.reason,
    campaignId: data.campaignId,
    templateName: data.templateName,
    scheduledFor: data.scheduledFor,
    metadata: data.metadata
  };
}

async function collectCSAT(supabase: any, csatData: any) {
  const { data, error } = await supabase.functions.invoke('csat-collector', {
    body: csatData
  });

  if (error) {
    throw new Error(`CSAT collection failed: ${error.message}`);
  }

  return {
    recorded: data.success,
    csatId: data.csatId,
    averageScore: data.averageScore,
    followUp: data.followUp
  };
}

async function updateUserSegment(supabase: any, phone: string, segmentData: any) {
  // Update contact information that affects segmentation
  const updateData: any = {};
  
  if (segmentData.contactType) updateData.contact_type = segmentData.contactType;
  if (segmentData.conversionStatus) updateData.conversion_status = segmentData.conversionStatus;
  if (segmentData.location) updateData.location = segmentData.location;
  
  updateData.last_interaction = new Date().toISOString();
  updateData.total_conversations = segmentData.totalConversations || 1;

  const { error } = await supabase
    .from('contacts')
    .upsert({
      phone_number: phone,
      ...updateData
    }, { 
      onConflict: 'phone_number' 
    });

  if (error) {
    throw new Error(`Segment update failed: ${error.message}`);
  }

  return {
    updated: true,
    phone: phone,
    changes: updateData
  };
}

async function optOutUser(supabase: any, phone: string, reason?: string) {
  // Update all frequency controls to opt out the user
  const { error } = await supabase
    .from('marketing_frequency_controls')
    .update({
      is_opted_out: true,
      opt_out_at: new Date().toISOString(),
      opt_out_reason: reason || 'User request',
      updated_at: new Date().toISOString()
    })
    .eq('phone_number', phone);

  if (error) {
    throw new Error(`Opt-out failed: ${error.message}`);
  }

  // Also create a general opt-out record if none exists
  await supabase
    .from('marketing_frequency_controls')
    .upsert({
      phone_number: phone,
      campaign_type: 'general',
      is_opted_out: true,
      opt_out_at: new Date().toISOString(),
      opt_out_reason: reason || 'User request'
    }, {
      onConflict: 'phone_number,campaign_type'
    });

  return {
    optedOut: true,
    phone: phone,
    reason: reason
  };
}

async function resetFrequencyLimits(supabase: any, phone: string, campaignType: string) {
  const { error } = await supabase
    .from('marketing_frequency_controls')
    .update({
      daily_count: 0,
      weekly_count: 0,
      monthly_count: 0,
      last_reset_daily: new Date().toISOString().split('T')[0],
      last_reset_weekly: new Date().toISOString().split('T')[0],
      last_reset_monthly: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    })
    .eq('phone_number', phone)
    .eq('campaign_type', campaignType);

  if (error) {
    throw new Error(`Frequency reset failed: ${error.message}`);
  }

  return {
    reset: true,
    phone: phone,
    campaignType: campaignType
  };
}

async function getMarketingStatus(supabase: any, phone: string) {
  // Get user's marketing status including CSAT, frequency limits, and segments
  const [csatScore, frequencyControls, contact] = await Promise.all([
    supabase.rpc('get_user_avg_csat', { user_phone: phone, days_back: 30 }),
    supabase.from('marketing_frequency_controls').select('*').eq('phone_number', phone),
    supabase.from('contacts').select('*').eq('phone_number', phone).single()
  ]);

  return {
    phone: phone,
    csatScore: csatScore.data || 3.0,
    frequencyControls: frequencyControls.data || [],
    contact: contact.data,
    eligibleForMarketing: (csatScore.data || 3.0) >= 3.5,
    lastInteraction: contact.data?.last_interaction,
    totalConversations: contact.data?.total_conversations || 0
  };
}
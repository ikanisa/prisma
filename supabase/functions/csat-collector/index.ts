import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CSATRequest {
  phone: string;
  score: number; // 1-5 scale
  feedback?: string;
  contextType?: string; // 'conversation', 'transaction', 'support'
  contextId?: string;
  agentId?: string;
  campaignId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phone, 
      score, 
      feedback, 
      contextType = 'conversation',
      contextId,
      agentId,
      campaignId
    }: CSATRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📊 CSAT collection for ${phone}: ${score}/5`);

    // Validate score
    if (score < 1 || score > 5) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Score must be between 1 and 5'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store CSAT score
    const { data: csatRecord, error: csatError } = await supabase
      .from('csat_scores')
      .insert({
        phone_number: phone,
        score: score,
        feedback_text: feedback,
        context_type: contextType,
        context_id: contextId,
        agent_id: agentId,
        campaign_id: campaignId
      })
      .select()
      .single();

    if (csatError) {
      console.error('Error storing CSAT score:', csatError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to store CSAT score'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update contact's conversion status if needed
    if (score >= 4) {
      await updateContactStatus(supabase, phone, 'satisfied');
    } else if (score <= 2) {
      await updateContactStatus(supabase, phone, 'needs_attention');
    }

    // Check if we need to trigger any follow-up actions
    const followUp = await evaluateCSATFollowUp(supabase, phone, score, contextType);

    console.log(`✅ CSAT recorded: ${score}/5 for ${phone}`);

    return new Response(JSON.stringify({
      success: true,
      csatId: csatRecord.id,
      followUp: followUp,
      averageScore: await calculateUserAverageCSAT(supabase, phone)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ CSAT collector error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function updateContactStatus(supabase: any, phone: string, status: string) {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ 
        conversion_status: status,
        last_interaction: new Date().toISOString()
      })
      .eq('phone_number', phone);

    if (error) {
      console.error('Error updating contact status:', error);
    }
  } catch (error) {
    console.error('Error in updateContactStatus:', error);
  }
}

async function evaluateCSATFollowUp(
  supabase: any, 
  phone: string, 
  score: number, 
  contextType: string
): Promise<any> {
  try {
    const followUp: any = {};

    if (score <= 2) {
      // Low score - trigger support escalation
      followUp.triggerSupport = true;
      followUp.reason = 'Low CSAT score requires attention';
      
      // Create support ticket
      await createSupportTicket(supabase, phone, score, contextType);
    } else if (score >= 4) {
      // High score - potential for marketing
      followUp.enableMarketing = true;
      followUp.reason = 'High CSAT allows marketing engagement';
      
      // Update marketing eligibility
      await updateMarketingEligibility(supabase, phone, true);
    }

    return followUp;
  } catch (error) {
    console.error('Error evaluating CSAT follow-up:', error);
    return {};
  }
}

async function createSupportTicket(
  supabase: any, 
  phone: string, 
  score: number, 
  contextType: string
) {
  try {
    // Create escalation ticket for low CSAT
    const { error } = await supabase
      .from('agent_execution_log')
      .insert({
        user_id: phone,
        function_name: 'csat-collector',
        input_data: {
          score: score,
          contextType: contextType,
          action: 'support_escalation'
        },
        success_status: true,
        error_details: `Low CSAT score ${score}/5 - requires support attention`
      });

    if (error) {
      console.error('Error creating support ticket:', error);
    }
  } catch (error) {
    console.error('Error in createSupportTicket:', error);
  }
}

async function updateMarketingEligibility(supabase: any, phone: string, eligible: boolean) {
  try {
    // Update or create marketing frequency controls to reflect eligibility
    const { error } = await supabase
      .from('marketing_frequency_controls')
      .upsert({
        phone_number: phone,
        campaign_type: 'general',
        is_opted_out: !eligible,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone_number,campaign_type'
      });

    if (error) {
      console.error('Error updating marketing eligibility:', error);
    }
  } catch (error) {
    console.error('Error in updateMarketingEligibility:', error);
  }
}

async function calculateUserAverageCSAT(supabase: any, phone: string): Promise<number> {
  try {
    const { data } = await supabase
      .rpc('get_user_avg_csat', { 
        user_phone: phone, 
        days_back: 30 
      });

    return data || 3.0;
  } catch (error) {
    console.error('Error calculating average CSAT:', error);
    return 3.0;
  }
}
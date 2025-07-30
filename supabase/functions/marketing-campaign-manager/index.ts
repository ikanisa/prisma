import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CampaignConfig {
  templateName: string;
  targetSegment: string;
  segmentSql?: string;
  maxSendsPerUser?: number;
  csatGateEnabled?: boolean;
  csatMinimum?: number;
  scheduledFor?: string;
  frequencyHours?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, campaignConfig } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📣 Marketing campaign action: ${action}`);

    let result;
    switch (action) {
      case 'check_eligibility':
        result = await checkMarketingEligibility(supabase);
        break;
      case 'run_campaign':
        result = await runMarketingCampaign(supabase, campaignConfig);
        break;
      case 'get_segments':
        result = await getUserSegments(supabase);
        break;
      case 'schedule_campaign':
        result = await scheduleCampaign(supabase, campaignConfig);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in marketing campaign manager:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkMarketingEligibility(supabase: any) {
  console.log('🔍 Checking CSAT eligibility for marketing campaigns...');
  
  try {
    // Check CSAT scores from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get satisfaction ratings from conversation analytics
    const { data: ratings } = await supabase
      .from('conversation_analytics')
      .select('satisfaction_rating')
      .not('satisfaction_rating', 'is', null)
      .gte('created_at', thirtyDaysAgo);

    if (!ratings || ratings.length < 10) {
      return {
        eligible: false,
        reason: 'Insufficient CSAT responses (minimum 10 required)',
        responseCount: ratings?.length || 0,
        averageCsat: null,
        gate: {
          minimumResponses: 10,
          minimumAverage: 4.2,
          evaluationPeriod: '30 days'
        }
      };
    }

    const validRatings = ratings.filter(r => r.satisfaction_rating >= 1 && r.satisfaction_rating <= 5);
    const averageCsat = validRatings.reduce((sum, r) => sum + r.satisfaction_rating, 0) / validRatings.length;

    const eligible = averageCsat >= 4.2 && validRatings.length >= 10;

    console.log(`📊 CSAT Check: ${validRatings.length} responses, avg: ${averageCsat.toFixed(2)}, eligible: ${eligible}`);

    return {
      eligible,
      reason: eligible ? 'CSAT requirements met' : `Average CSAT ${averageCsat.toFixed(2)} below required 4.2`,
      responseCount: validRatings.length,
      averageCsat: Number(averageCsat.toFixed(2)),
      gate: {
        minimumResponses: 10,
        minimumAverage: 4.2,
        evaluationPeriod: '30 days'
      }
    };
  } catch (error) {
    console.error('Error checking CSAT eligibility:', error);
    return {
      eligible: false,
      reason: 'Error checking CSAT data',
      error: error.message
    };
  }
}

async function runMarketingCampaign(supabase: any, config: CampaignConfig) {
  console.log(`🚀 Running marketing campaign: ${config.templateName} -> ${config.targetSegment}`);

  // Check CSAT gate if enabled
  if (config.csatGateEnabled !== false) {
    const eligibility = await checkMarketingEligibility(supabase);
    if (!eligibility.eligible) {
      console.log('❌ Marketing campaign blocked by CSAT gate');
      return {
        sent: 0,
        blocked: true,
        reason: eligibility.reason,
        csatData: eligibility
      };
    }
  }

  // Get target users based on segment
  const targetUsers = await getSegmentUsers(supabase, config);
  
  if (!targetUsers.length) {
    return {
      sent: 0,
      error: 'No users found in target segment'
    };
  }

  console.log(`🎯 Found ${targetUsers.length} users in segment: ${config.targetSegment}`);

  // Send templates to users
  const sendResults = await sendCampaignMessages(supabase, targetUsers, config);

  // Log campaign execution
  await logCampaignExecution(supabase, config, sendResults);

  return {
    sent: sendResults.success,
    failed: sendResults.failed,
    totalTargeted: targetUsers.length,
    templateName: config.templateName,
    segment: config.targetSegment
  };
}

async function getSegmentUsers(supabase: any, config: CampaignConfig) {
  try {
    let query;
    
    // Pre-defined segments
    switch (config.targetSegment) {
      case 'driver_prospects':
        query = supabase
          .from('contacts')
          .select('phone_number')
          .eq('contact_type', 'prospect')
          .contains('tags', ['driver']);
        break;
      
      case 'business_prospects':
        query = supabase
          .from('contacts')
          .select('phone_number')
          .eq('contact_type', 'prospect')
          .contains('tags', ['business']);
        break;
      
      case 'inactive_users':
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = supabase
          .from('contacts')
          .select('phone_number')
          .lt('last_interaction', sevenDaysAgo)
          .eq('status', 'active');
        break;
      
      case 'payment_prospects':
        query = supabase
          .from('contacts')
          .select('phone_number')
          .eq('conversion_status', 'prospect')
          .not('tags', 'cs', '["payment_user"]');
        break;
      
      case 'all_active':
        query = supabase
          .from('contacts')
          .select('phone_number')
          .eq('status', 'active');
        break;
      
      default:
        // Custom SQL segment
        if (config.segmentSql) {
          const { data } = await supabase.rpc('execute_sql', { 
            query: config.segmentSql 
          });
          return data || [];
        }
        return [];
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting segment users:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting segment users:', error);
    return [];
  }
}

async function sendCampaignMessages(supabase: any, users: any[], config: CampaignConfig) {
  const results = { success: 0, failed: 0 };
  
  for (const user of users) {
    try {
      // Check sending frequency limits
      if (config.maxSendsPerUser && config.frequencyHours) {
        const canSend = await checkSendingLimits(supabase, user.phone_number, config);
        if (!canSend) {
          console.log(`⏭️ Skipping ${user.phone_number} - frequency limit reached`);
          continue;
        }
      }

      // Send template via template function
      const { data: templateResult } = await supabase.functions.invoke('whatsapp-templates-manager', {
        body: {
          action: 'send',
          templateData: {
            name: config.templateName,
            to: user.phone_number,
            language: 'en_US'
          }
        }
      });

      if (templateResult?.success) {
        results.success++;
        
        // Track the send
        await supabase.functions.invoke('template-analytics-tracker', {
          body: {
            events: [{
              eventType: 'sent',
              templateName: config.templateName,
              userId: user.phone_number,
              metadata: { campaign: config.targetSegment }
            }]
          }
        });
      } else {
        results.failed++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error sending to ${user.phone_number}:`, error);
      results.failed++;
    }
  }
  
  return results;
}

async function checkSendingLimits(supabase: any, phoneNumber: string, config: CampaignConfig) {
  try {
    const cutoffTime = new Date(Date.now() - (config.frequencyHours! * 60 * 60 * 1000)).toISOString();
    
    const { data: recentSends } = await supabase
      .from('template_sends')
      .select('id')
      .eq('wa_id', phoneNumber)
      .eq('template_name', config.templateName)
      .gte('sent_at', cutoffTime);

    return (recentSends?.length || 0) < (config.maxSendsPerUser || 1);
  } catch (error) {
    console.error('Error checking sending limits:', error);
    return true; // Allow send if check fails
  }
}

async function logCampaignExecution(supabase: any, config: CampaignConfig, results: any) {
  try {
    await supabase
      .from('campaign_messages')
      .insert({
        campaign_id: `${config.templateName}_${config.targetSegment}`,
        phone_number: 'CAMPAIGN_LOG',
        message_content: `Campaign: ${config.templateName} to ${config.targetSegment}`,
        status: 'completed',
        scheduled_for: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        metadata: {
          config,
          results,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('Error logging campaign execution:', error);
  }
}

async function getUserSegments(supabase: any) {
  try {
    // Get segment sizes
    const segments = [
      { name: 'driver_prospects', description: 'Potential drivers' },
      { name: 'business_prospects', description: 'Potential business partners' },
      { name: 'inactive_users', description: 'Users inactive for 7+ days' },
      { name: 'payment_prospects', description: 'Users who haven\'t used payments' },
      { name: 'all_active', description: 'All active users' }
    ];

    const segmentData = await Promise.all(
      segments.map(async (segment) => {
        const users = await getSegmentUsers(supabase, { targetSegment: segment.name } as CampaignConfig);
        return {
          ...segment,
          userCount: users.length
        };
      })
    );

    return segmentData;
  } catch (error) {
    console.error('Error getting user segments:', error);
    return [];
  }
}

async function scheduleCampaign(supabase: any, config: CampaignConfig) {
  try {
    // Create scheduled task
    await supabase
      .from('automated_tasks')
      .insert({
        task_type: 'marketing_campaign',
        task_name: `Campaign: ${config.templateName}`,
        payload: config,
        scheduled_for: config.scheduledFor || new Date().toISOString(),
        status: 'pending'
      });

    return {
      scheduled: true,
      templateName: config.templateName,
      segment: config.targetSegment,
      scheduledFor: config.scheduledFor
    };
  } catch (error) {
    console.error('Error scheduling campaign:', error);
    throw error;
  }
}
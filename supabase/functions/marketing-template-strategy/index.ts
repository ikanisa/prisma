import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketingRequest {
  phone: string;
  campaignType?: string;
  userContext?: any;
  triggerEvent?: string;
}

interface MarketingDecision {
  shouldSend: boolean;
  campaignId?: string;
  templateName?: string;
  segment?: string;
  reason?: string;
  scheduledFor?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phone, 
      campaignType = 'general', 
      userContext = {}, 
      triggerEvent 
    }: MarketingRequest = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🎯 Marketing strategy evaluation for ${phone}, campaign: ${campaignType}`);

    // Step 1: Check CSAT gating
    const csatCheck = await checkCSATGating(supabase, phone);
    if (!csatCheck.passed) {
      console.log(`❌ CSAT gating failed: ${csatCheck.reason}`);
      return new Response(JSON.stringify({
        shouldSend: false,
        reason: csatCheck.reason,
        metadata: { csatScore: csatCheck.score }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Check frequency controls
    const frequencyCheck = await checkFrequencyControls(supabase, phone, campaignType);
    if (!frequencyCheck.canSend) {
      console.log(`❌ Frequency limit exceeded: ${frequencyCheck.reason}`);
      return new Response(JSON.stringify({
        shouldSend: false,
        reason: frequencyCheck.reason,
        metadata: { limits: frequencyCheck.limits }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Find best matching campaign and segment
    const campaignMatch = await findBestCampaign(supabase, phone, campaignType, userContext, triggerEvent);
    if (!campaignMatch.campaign) {
      console.log(`❌ No suitable campaign found`);
      return new Response(JSON.stringify({
        shouldSend: false,
        reason: 'No suitable campaign found',
        metadata: { campaignType, triggerEvent }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 4: Calculate optimal timing
    const timing = await calculateOptimalTiming(supabase, phone, campaignMatch.campaign);

    // Step 5: Schedule the marketing message
    const result = await scheduleMarketingMessage(
      supabase, 
      phone, 
      campaignMatch.campaign, 
      campaignMatch.segment, 
      timing,
      csatCheck.score
    );

    console.log(`✅ Marketing strategy decision: ${result.shouldSend ? 'SEND' : 'SKIP'}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Marketing strategy error:', error);
    return new Response(JSON.stringify({ 
      shouldSend: false, 
      reason: 'Strategy evaluation failed',
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkCSATGating(supabase: any, phone: string): Promise<{
  passed: boolean;
  score: number;
  reason?: string;
}> {
  try {
    // Get user's average CSAT score over last 30 days
    const { data: avgScore } = await supabase
      .rpc('get_user_avg_csat', { 
        user_phone: phone, 
        days_back: 30 
      });

    const score = avgScore || 3.0; // Default neutral score
    const threshold = 3.5; // Minimum threshold for marketing

    if (score >= threshold) {
      return { passed: true, score };
    } else {
      return { 
        passed: false, 
        score, 
        reason: `CSAT score ${score} below threshold ${threshold}` 
      };
    }
  } catch (error) {
    console.error('Error checking CSAT:', error);
    // Default to allow if we can't check CSAT
    return { passed: true, score: 3.0 };
  }
}

async function checkFrequencyControls(supabase: any, phone: string, campaignType: string): Promise<{
  canSend: boolean;
  reason?: string;
  limits?: any;
}> {
  try {
    const { data: canSend } = await supabase
      .rpc('check_marketing_frequency', {
        user_phone: phone,
        campaign_type: campaignType
      });

    if (canSend) {
      return { canSend: true };
    } else {
      // Get current limits for context
      const { data: controls } = await supabase
        .from('marketing_frequency_controls')
        .select('daily_count, weekly_count, monthly_count, daily_limit, weekly_limit, monthly_limit')
        .eq('phone_number', phone)
        .eq('campaign_type', campaignType)
        .single();

      return {
        canSend: false,
        reason: 'Marketing frequency limits exceeded',
        limits: controls
      };
    }
  } catch (error) {
    console.error('Error checking frequency:', error);
    // Default to allow if we can't check frequency
    return { canSend: true };
  }
}

async function findBestCampaign(
  supabase: any, 
  phone: string, 
  campaignType: string, 
  userContext: any,
  triggerEvent?: string
): Promise<{
  campaign?: any;
  segment?: any;
}> {
  try {
    // Get active campaigns that match the type and timing
    const { data: campaigns } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('status', 'active')
      .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`)
      .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
      .order('priority', { ascending: false });

    if (!campaigns || campaigns.length === 0) {
      return {};
    }

    // Find best matching campaign
    let bestCampaign = null;
    let bestSegment = null;

    for (const campaign of campaigns) {
      // Check if user matches any segment for this campaign
      const segment = await checkUserSegmentMatch(supabase, phone, campaign, userContext);
      if (segment) {
        bestCampaign = campaign;
        bestSegment = segment;
        break; // Take first match (campaigns are ordered by priority)
      }
    }

    return {
      campaign: bestCampaign,
      segment: bestSegment
    };
  } catch (error) {
    console.error('Error finding campaign:', error);
    return {};
  }
}

async function checkUserSegmentMatch(
  supabase: any, 
  phone: string, 
  campaign: any, 
  userContext: any
): Promise<any> {
  try {
    // Get user segments
    const { data: segments } = await supabase
      .from('user_segments')
      .select('*')
      .eq('is_active', true);

    if (!segments) return null;

    // Simple segment matching based on criteria
    for (const segment of segments) {
      const criteria = segment.criteria || {};
      
      // Check if user matches segment criteria
      if (await evaluateSegmentCriteria(supabase, phone, criteria, userContext)) {
        return segment;
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking segment match:', error);
    return null;
  }
}

async function evaluateSegmentCriteria(
  supabase: any, 
  phone: string, 
  criteria: any, 
  userContext: any
): Promise<boolean> {
  try {
    // Get user contact info
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phone)
      .single();

    if (!contact) return false;

    // Evaluate different criteria types
    if (criteria.userType) {
      const userType = contact.contact_type || 'prospect';
      if (criteria.userType !== userType) return false;
    }

    if (criteria.minConversations) {
      const conversations = contact.total_conversations || 0;
      if (conversations < criteria.minConversations) return false;
    }

    if (criteria.conversationStatus) {
      const status = contact.conversion_status || 'prospect';
      if (criteria.conversationStatus !== status) return false;
    }

    if (criteria.location && contact.location) {
      if (!contact.location.includes(criteria.location)) return false;
    }

    return true;
  } catch (error) {
    console.error('Error evaluating criteria:', error);
    return false;
  }
}

async function calculateOptimalTiming(
  supabase: any, 
  phone: string, 
  campaign: any
): Promise<Date> {
  try {
    const timingConfig = campaign.timing_config || {};
    const now = new Date();

    // Check for specific timing preferences
    if (timingConfig.preferredHours) {
      const currentHour = now.getHours();
      const [startHour, endHour] = timingConfig.preferredHours;
      
      if (currentHour < startHour || currentHour > endHour) {
        // Schedule for next preferred time
        const nextDay = currentHour > endHour ? 1 : 0;
        const scheduledTime = new Date(now);
        scheduledTime.setDate(scheduledTime.getDate() + nextDay);
        scheduledTime.setHours(startHour, 0, 0, 0);
        return scheduledTime;
      }
    }

    // Check timing patterns for this user
    const { data: patterns } = await supabase
      .from('contact_timing_patterns')
      .select('*')
      .order('engagement_score', { ascending: false })
      .limit(1);

    if (patterns && patterns.length > 0) {
      const pattern = patterns[0];
      if (pattern.time_of_day && pattern.day_of_week) {
        // Calculate next optimal time based on patterns
        return calculateNextOptimalTime(pattern.time_of_day, pattern.day_of_week);
      }
    }

    // Default: send immediately if no specific timing rules
    return now;
  } catch (error) {
    console.error('Error calculating timing:', error);
    return new Date(); // Default to now
  }
}

function calculateNextOptimalTime(optimalHour: number, optimalDayOfWeek: number): Date {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  
  let daysToAdd = 0;
  
  // Calculate days until optimal day of week
  if (currentDay === optimalDayOfWeek && currentHour < optimalHour) {
    // Same day, but before optimal hour
    daysToAdd = 0;
  } else {
    // Calculate days to next optimal day
    daysToAdd = (optimalDayOfWeek + 7 - currentDay) % 7;
    if (daysToAdd === 0) daysToAdd = 7; // Next week
  }
  
  const optimalTime = new Date(now);
  optimalTime.setDate(optimalTime.getDate() + daysToAdd);
  optimalTime.setHours(optimalHour, 0, 0, 0);
  
  return optimalTime;
}

async function scheduleMarketingMessage(
  supabase: any,
  phone: string,
  campaign: any,
  segment: any,
  scheduledFor: Date,
  csatScore: number
): Promise<MarketingDecision> {
  try {
    // Create marketing send log entry
    const { data: logEntry, error } = await supabase
      .from('marketing_send_log')
      .insert({
        campaign_id: campaign.id,
        phone_number: phone,
        template_name: campaign.template_name,
        segment_id: segment?.id,
        user_csat_score: csatScore,
        scheduled_for: scheduledFor.toISOString(),
        status: 'scheduled',
        metadata: {
          campaignType: campaign.name,
          segmentName: segment?.name,
          schedulingReason: 'marketing_strategy_optimization'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error scheduling message:', error);
      return {
        shouldSend: false,
        reason: 'Failed to schedule message',
        metadata: { error: error.message }
      };
    }

    // Increment frequency counters
    await supabase.rpc('increment_marketing_frequency', {
      user_phone: phone,
      campaign_type: campaign.name
    });

    return {
      shouldSend: true,
      campaignId: campaign.id,
      templateName: campaign.template_name,
      segment: segment?.name,
      scheduledFor: scheduledFor.toISOString(),
      reason: 'Scheduled based on CSAT gating, frequency controls, and optimal timing',
      metadata: {
        logId: logEntry.id,
        csatScore,
        priority: campaign.priority,
        segmentCriteria: segment?.criteria
      }
    };
  } catch (error) {
    console.error('Error scheduling marketing message:', error);
    return {
      shouldSend: false,
      reason: 'Scheduling failed',
      metadata: { error: error.message }
    };
  }
}
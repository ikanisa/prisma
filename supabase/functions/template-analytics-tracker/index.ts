import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TemplateEvent {
  eventType: 'sent' | 'delivered' | 'read' | 'clicked' | 'converted';
  templateName: string;
  userId: string;
  metadata?: any;
  timestamp?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { events } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📊 Tracking ${events.length} template events`);

    const results = await Promise.all(
      events.map((event: TemplateEvent) => trackTemplateEvent(supabase, event))
    );

    // Generate analytics insights
    const insights = await generateAnalyticsInsights(supabase, events);

    return new Response(JSON.stringify({
      success: true,
      eventsTracked: results.length,
      insights
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in template analytics tracker:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function trackTemplateEvent(supabase: any, event: TemplateEvent) {
  try {
    // Log to template_sends table
    const { data, error } = await supabase
      .from('template_sends')
      .insert({
        wa_id: event.userId,
        template_name: event.templateName,
        sent_at: event.timestamp || new Date().toISOString(),
        event_type: event.eventType,
        metadata: event.metadata || {}
      });

    if (error) {
      console.error('Error tracking template event:', error);
      return { success: false, error };
    }

    // Update conversation analytics if this is a significant event
    if (['clicked', 'converted'].includes(event.eventType)) {
      await updateConversationAnalytics(supabase, event);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error tracking template event:', error);
    return { success: false, error: error.message };
  }
}

async function updateConversationAnalytics(supabase: any, event: TemplateEvent) {
  try {
    // Get or create conversation analytics record
    const { data: existing } = await supabase
      .from('conversation_analytics')
      .select('*')
      .eq('phone_number', event.userId)
      .eq('session_id', getCurrentSessionId(event.userId))
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('conversation_analytics')
        .update({
          total_messages: existing.total_messages + 1,
          last_message_at: new Date().toISOString(),
          ...(event.eventType === 'converted' ? { 
            conversion_event: event.templateName,
            flow_completed: true 
          } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new analytics record
      await supabase
        .from('conversation_analytics')
        .insert({
          phone_number: event.userId,
          session_id: getCurrentSessionId(event.userId),
          total_messages: 1,
          first_message_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          ...(event.eventType === 'converted' ? { 
            conversion_event: event.templateName,
            flow_completed: true 
          } : {})
        });
    }
  } catch (error) {
    console.error('Error updating conversation analytics:', error);
  }
}

function getCurrentSessionId(userId: string): string {
  // Simple session ID based on user and current hour
  const hour = Math.floor(Date.now() / (1000 * 60 * 60));
  return `${userId}_${hour}`;
}

async function generateAnalyticsInsights(supabase: any, events: TemplateEvent[]) {
  try {
    // Get recent template performance data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentSends } = await supabase
      .from('template_sends')
      .select('*')
      .gte('sent_at', thirtyDaysAgo);

    if (!recentSends?.length) {
      return { message: 'No recent data for insights' };
    }

    // Calculate template performance metrics
    const templateStats = calculateTemplateStats(recentSends);
    
    // Get top performing templates
    const topTemplates = getTopPerformingTemplates(templateStats);
    
    // Get user engagement patterns
    const engagementPatterns = getEngagementPatterns(recentSends);
    
    return {
      templateStats,
      topTemplates,
      engagementPatterns,
      totalSends: recentSends.length,
      uniqueUsers: new Set(recentSends.map(s => s.wa_id)).size,
      avgResponseTime: calculateAvgResponseTime(recentSends)
    };
  } catch (error) {
    console.error('Error generating analytics insights:', error);
    return { error: error.message };
  }
}

function calculateTemplateStats(sends: any[]) {
  const templateGroups = sends.reduce((acc, send) => {
    if (!acc[send.template_name]) {
      acc[send.template_name] = {
        name: send.template_name,
        totalSends: 0,
        clicks: 0,
        conversions: 0,
        uniqueUsers: new Set()
      };
    }
    
    acc[send.template_name].totalSends++;
    acc[send.template_name].uniqueUsers.add(send.wa_id);
    
    if (send.event_type === 'clicked') {
      acc[send.template_name].clicks++;
    }
    if (send.event_type === 'converted') {
      acc[send.template_name].conversions++;
    }
    
    return acc;
  }, {});

  // Calculate rates
  return Object.values(templateGroups).map((template: any) => ({
    name: template.name,
    totalSends: template.totalSends,
    uniqueUsers: template.uniqueUsers.size,
    clickRate: template.clicks / template.totalSends,
    conversionRate: template.conversions / template.totalSends,
    engagement: (template.clicks + template.conversions * 2) / template.totalSends
  }));
}

function getTopPerformingTemplates(templateStats: any[], limit = 5) {
  return templateStats
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, limit)
    .map(template => ({
      name: template.name,
      engagement: template.engagement,
      clickRate: template.clickRate,
      conversionRate: template.conversionRate
    }));
}

function getEngagementPatterns(sends: any[]) {
  const hourlyPattern = new Array(24).fill(0);
  const dailyPattern = new Array(7).fill(0);
  
  sends.forEach(send => {
    const date = new Date(send.sent_at);
    const hour = date.getHours();
    const day = date.getDay();
    
    if (send.event_type === 'clicked' || send.event_type === 'converted') {
      hourlyPattern[hour]++;
      dailyPattern[day]++;
    }
  });
  
  return {
    bestHours: hourlyPattern
      .map((count, hour) => ({ hour, engagement: count }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3),
    bestDays: dailyPattern
      .map((count, day) => ({ 
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day], 
        engagement: count 
      }))
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3)
  };
}

function calculateAvgResponseTime(sends: any[]) {
  const responseTimes = sends
    .filter(send => send.metadata?.responseTime)
    .map(send => send.metadata.responseTime);
    
  if (responseTimes.length === 0) return null;
  
  return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
}
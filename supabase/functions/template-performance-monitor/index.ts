import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerformanceMetrics {
  templateName: string;
  totalSent: number;
  delivered: number;
  read: number;
  clicked: number;
  converted: number;
  deliveryRate: number;
  readRate: number;
  clickRate: number;
  conversionRate: number;
  avgResponseTime: number;
  errorRate: number;
  uniqueUsers: number;
  period: string;
}

interface ABTestMetrics {
  testName: string;
  variantA: PerformanceMetrics;
  variantB: PerformanceMetrics;
  winningVariant: string;
  confidence: number;
  sampleSize: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'metrics';
    const templateName = url.searchParams.get('template');
    const period = url.searchParams.get('period') || '7d';
    const testId = url.searchParams.get('testId');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📊 Template performance monitor: ${action}`);

    switch (action) {
      case 'metrics':
        const metrics = await getTemplateMetrics(supabase, templateName, period);
        return new Response(JSON.stringify({ success: true, metrics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'performance':
        const performance = await getPerformanceAnalytics(supabase, period);
        return new Response(JSON.stringify({ success: true, performance }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'abtest':
        const abTestResults = await getABTestResults(supabase, testId);
        return new Response(JSON.stringify({ success: true, abTestResults }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'realtime':
        const realtimeMetrics = await getRealtimeMetrics(supabase);
        return new Response(JSON.stringify({ success: true, realtimeMetrics }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in template performance monitor:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getTemplateMetrics(supabase: any, templateName?: string, period: string = '7d'): Promise<PerformanceMetrics[]> {
  const periodDate = getPeriodDate(period);
  
  try {
    let query = supabase
      .from('template_sends')
      .select('*')
      .gte('sent_at', periodDate.toISOString());

    if (templateName) {
      query = query.eq('template_name', templateName);
    }

    const { data: sends, error } = await query;

    if (error) {
      console.error('Error fetching template sends:', error);
      return [];
    }

    // Group by template and calculate metrics
    const templateGroups = groupByTemplate(sends || []);
    
    return Object.entries(templateGroups).map(([name, events]) => 
      calculateTemplateMetrics(name, events, period)
    );

  } catch (error) {
    console.error('Error getting template metrics:', error);
    return [];
  }
}

async function getPerformanceAnalytics(supabase: any, period: string): Promise<any> {
  const periodDate = getPeriodDate(period);
  
  try {
    // Get template performance data
    const { data: sends } = await supabase
      .from('template_sends')
      .select('*')
      .gte('sent_at', periodDate.toISOString());

    // Get conversation analytics for context
    const { data: conversations } = await supabase
      .from('conversation_analytics')
      .select('*')
      .gte('created_at', periodDate.toISOString());

    // Calculate overall performance metrics
    const overallMetrics = calculateOverallPerformance(sends || [], conversations || []);
    
    // Get top performing templates
    const templateMetrics = await getTemplateMetrics(supabase, undefined, period);
    const topTemplates = templateMetrics
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 10);

    // Get engagement trends over time
    const trends = calculateEngagementTrends(sends || [], period);

    return {
      overall: overallMetrics,
      topTemplates,
      trends,
      totalTemplates: templateMetrics.length,
      period
    };

  } catch (error) {
    console.error('Error getting performance analytics:', error);
    return {};
  }
}

async function getABTestResults(supabase: any, testId?: string): Promise<ABTestMetrics[]> {
  try {
    // Get A/B test configurations
    const { data: tests } = await supabase
      .from('template_ab_tests')
      .select('*')
      .eq('status', 'running')
      .or(testId ? `id.eq.${testId}` : '');

    if (!tests?.length) {
      return [];
    }

    const results: ABTestMetrics[] = [];

    for (const test of tests) {
      // Get metrics for variant A
      const variantAMetrics = await getTemplateMetrics(supabase, test.variant_a_template, '30d');
      const variantBMetrics = await getTemplateMetrics(supabase, test.variant_b_template, '30d');

      if (variantAMetrics.length && variantBMetrics.length) {
        const variantA = variantAMetrics[0];
        const variantB = variantBMetrics[0];
        
        // Calculate statistical significance
        const { winningVariant, confidence } = calculateStatisticalSignificance(variantA, variantB);
        
        results.push({
          testName: test.name,
          variantA,
          variantB,
          winningVariant,
          confidence,
          sampleSize: variantA.totalSent + variantB.totalSent
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Error getting A/B test results:', error);
    return [];
  }
}

async function getRealtimeMetrics(supabase: any): Promise<any> {
  const last15Minutes = new Date(Date.now() - 15 * 60 * 1000);
  
  try {
    const { data: recentSends } = await supabase
      .from('template_sends')
      .select('*')
      .gte('sent_at', last15Minutes.toISOString())
      .order('sent_at', { ascending: false });

    const { data: recentAnalytics } = await supabase
      .from('conversation_analytics')
      .select('*')
      .gte('updated_at', last15Minutes.toISOString());

    return {
      recentSends: recentSends?.length || 0,
      activeConversations: recentAnalytics?.length || 0,
      lastUpdated: new Date().toISOString(),
      topActiveTemplates: getTopActiveTemplates(recentSends || [])
    };

  } catch (error) {
    console.error('Error getting realtime metrics:', error);
    return {};
  }
}

function getPeriodDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    default: return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function groupByTemplate(sends: any[]): Record<string, any[]> {
  return sends.reduce((acc, send) => {
    if (!acc[send.template_name]) {
      acc[send.template_name] = [];
    }
    acc[send.template_name].push(send);
    return acc;
  }, {});
}

function calculateTemplateMetrics(templateName: string, events: any[], period: string): PerformanceMetrics {
  const sent = events.filter(e => e.event_type === 'sent').length;
  const delivered = events.filter(e => e.event_type === 'delivered').length;
  const read = events.filter(e => e.event_type === 'read').length;
  const clicked = events.filter(e => e.event_type === 'clicked').length;
  const converted = events.filter(e => e.event_type === 'converted').length;
  const errors = events.filter(e => e.metadata?.error).length;
  
  const uniqueUsers = new Set(events.map(e => e.wa_id)).size;
  
  // Calculate response times
  const responseTimes = events
    .filter(e => e.metadata?.responseTime)
    .map(e => e.metadata.responseTime);
  const avgResponseTime = responseTimes.length > 0 
    ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
    : 0;

  return {
    templateName,
    totalSent: sent,
    delivered,
    read,
    clicked,
    converted,
    deliveryRate: sent > 0 ? delivered / sent : 0,
    readRate: delivered > 0 ? read / delivered : 0,
    clickRate: read > 0 ? clicked / read : 0,
    conversionRate: clicked > 0 ? converted / clicked : 0,
    avgResponseTime,
    errorRate: sent > 0 ? errors / sent : 0,
    uniqueUsers,
    period
  };
}

function calculateOverallPerformance(sends: any[], conversations: any[]): any {
  const totalSent = sends.filter(s => s.event_type === 'sent').length;
  const totalClicked = sends.filter(s => s.event_type === 'clicked').length;
  const totalConverted = sends.filter(s => s.event_type === 'converted').length;
  const totalErrors = sends.filter(s => s.metadata?.error).length;
  
  const activeConversations = conversations.filter(c => 
    new Date(c.last_message_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length;

  const avgSessionDuration = conversations.length > 0
    ? conversations.reduce((sum, c) => sum + (c.session_duration_minutes || 0), 0) / conversations.length
    : 0;

  return {
    totalSent,
    totalClicked,
    totalConverted,
    totalErrors,
    overallClickRate: totalSent > 0 ? totalClicked / totalSent : 0,
    overallConversionRate: totalClicked > 0 ? totalConverted / totalClicked : 0,
    errorRate: totalSent > 0 ? totalErrors / totalSent : 0,
    activeConversations,
    avgSessionDuration,
    uptime: calculateUptime(sends)
  };
}

function calculateEngagementTrends(sends: any[], period: string): any[] {
  const timeSlots = getTimeSlots(period);
  
  return timeSlots.map(slot => {
    const slotSends = sends.filter(s => 
      new Date(s.sent_at) >= slot.start && new Date(s.sent_at) < slot.end
    );
    
    const sent = slotSends.filter(s => s.event_type === 'sent').length;
    const clicked = slotSends.filter(s => s.event_type === 'clicked').length;
    
    return {
      timestamp: slot.start.toISOString(),
      sent,
      clicked,
      clickRate: sent > 0 ? clicked / sent : 0
    };
  });
}

function getTimeSlots(period: string): Array<{start: Date, end: Date}> {
  const now = new Date();
  const slots = [];
  let slotDuration: number;
  let totalSlots: number;

  switch (period) {
    case '1h':
      slotDuration = 5 * 60 * 1000; // 5 minutes
      totalSlots = 12;
      break;
    case '24h':
      slotDuration = 60 * 60 * 1000; // 1 hour
      totalSlots = 24;
      break;
    case '7d':
      slotDuration = 24 * 60 * 60 * 1000; // 1 day
      totalSlots = 7;
      break;
    case '30d':
      slotDuration = 24 * 60 * 60 * 1000; // 1 day
      totalSlots = 30;
      break;
    default:
      slotDuration = 24 * 60 * 60 * 1000;
      totalSlots = 7;
  }

  for (let i = totalSlots - 1; i >= 0; i--) {
    const end = new Date(now.getTime() - i * slotDuration);
    const start = new Date(end.getTime() - slotDuration);
    slots.push({ start, end });
  }

  return slots;
}

function calculateStatisticalSignificance(variantA: PerformanceMetrics, variantB: PerformanceMetrics): {winningVariant: string, confidence: number} {
  // Simple statistical significance calculation
  // In production, use proper statistical methods like chi-square test
  
  const aDiff = Math.abs(variantA.conversionRate - variantB.conversionRate);
  const sampleSize = Math.min(variantA.totalSent, variantB.totalSent);
  
  // Simplified confidence calculation
  let confidence = 0;
  if (sampleSize > 100 && aDiff > 0.05) confidence = 0.95;
  else if (sampleSize > 50 && aDiff > 0.03) confidence = 0.90;
  else if (sampleSize > 30 && aDiff > 0.02) confidence = 0.80;
  else confidence = 0.50;

  const winningVariant = variantA.conversionRate > variantB.conversionRate ? 'A' : 'B';
  
  return { winningVariant, confidence };
}

function getTopActiveTemplates(recentSends: any[]): any[] {
  const templateCounts = recentSends.reduce((acc, send) => {
    acc[send.template_name] = (acc[send.template_name] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(templateCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([template, count]) => ({ template, count }));
}

function calculateUptime(sends: any[]): number {
  // Calculate system uptime based on successful sends vs errors
  const successful = sends.filter(s => !s.metadata?.error).length;
  const total = sends.length;
  return total > 0 ? successful / total : 1;
}
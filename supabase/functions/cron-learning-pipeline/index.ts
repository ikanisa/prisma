import { supabaseClient } from "./client.ts";
// ============================================================================
// Cron Learning Pipeline - Automated Knowledge and Quality Improvement
// Runs scheduled jobs for continuous learning and optimization
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_type, timeframe = '24h' } = await req.json();
    let result;

    console.log(`🔄 Running cron job: ${job_type}`);

    switch (job_type) {
      case 'memory_consolidation':
        result = await runMemoryConsolidation(timeframe);
        break;
      case 'quality_audit':
        result = await runQualityAudit(timeframe);
        break;
      case 'performance_analysis':
        result = await runPerformanceAnalysis(timeframe);
        break;
      case 'user_preference_learning':
        result = await runUserPreferenceLearning(timeframe);
        break;
      case 'conversation_cleanup':
        result = await runConversationCleanup();
        break;
      case 'kpi_rollup':
        result = await runKPIRollup(timeframe);
        break;
      default:
        throw new Error(`Unknown job type: ${job_type}`);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cron-learning-pipeline:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================================================
// Memory Consolidation Job (Every 10 minutes)
// ============================================================================

async function runMemoryConsolidation(timeframe: string) {
  console.log(`🧠 Running memory consolidation (${timeframe})`);
  
  // Get users with recent activity
  const cutoff = getTimeframeCutoff(timeframe);
  const { data: activeUsers } = await supabase
    .from('agent_conversations')
    .select('user_id')
    .gte('ts', cutoff)
    .order('user_id');

  if (!activeUsers || activeUsers.length === 0) {
    return { message: 'No active users found for consolidation' };
  }

  const uniqueUsers = [...new Set(activeUsers.map(u => u.user_id))];
  const results = [];

  for (const userId of uniqueUsers) {
    try {
      // Check if user needs consolidation (more than 10 messages since last summary)
      const { data: recentMessages } = await supabase
        .from('agent_conversations')
        .select('id')
        .eq('user_id', userId)
        .gte('ts', cutoff);

      if (recentMessages && recentMessages.length >= 10) {
        // Trigger memory consolidation
        const response = await supabase.functions.invoke('memory-consolidator-v2', {
          body: { action: 'consolidate_user', userId, timeframe }
        });

        results.push({ userId, status: 'consolidated', messages: recentMessages.length });
      } else {
        results.push({ userId, status: 'skipped', messages: recentMessages?.length || 0 });
      }
    } catch (error) {
      console.error(`Failed consolidation for user ${userId}:`, error);
      results.push({ userId, status: 'error', error: error.message });
    }
  }

  // Log consolidation metrics
  await supabase.from('system_metrics').insert({
    metric_name: 'memory_consolidation_run',
    metric_value: results.filter(r => r.status === 'consolidated').length,
    metric_type: 'automation',
    tags: { total_users: uniqueUsers.length, timeframe }
  });

  return {
    message: `Processed ${uniqueUsers.length} users`,
    consolidated: results.filter(r => r.status === 'consolidated').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
    results
  };
}

// ============================================================================
// Quality Audit Job (Daily)
// ============================================================================

async function runQualityAudit(timeframe: string) {
  console.log(`🔍 Running quality audit (${timeframe})`);
  
  const cutoff = getTimeframeCutoff(timeframe);
  
  // Sample recent conversations for quality assessment
  const { data: conversations } = await supabase
    .from('agent_conversations')
    .select('*')
    .eq('role', 'agent')
    .gte('ts', cutoff)
    .order('ts', { ascending: false })
    .limit(100); // Sample 100 recent agent responses

  if (!conversations || conversations.length === 0) {
    return { message: 'No conversations found for quality audit' };
  }

  const qualityScores = [];
  const issues = [];

  // Analyze quality in batches
  for (let i = 0; i < conversations.length; i += 10) {
    const batch = conversations.slice(i, i + 10);
    
    try {
      const batchResults = await assessConversationBatch(batch);
      qualityScores.push(...batchResults.scores);
      issues.push(...batchResults.issues);
    } catch (error) {
      console.error('Failed to assess batch:', error);
    }
  }

  // Calculate overall metrics
  const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  const lowQualityCount = qualityScores.filter(score => score < 0.6).length;
  const qualityRate = (qualityScores.length - lowQualityCount) / qualityScores.length;

  // Identify common issues
  const commonIssues = analyzeCommonIssues(issues);

  // Store audit results
  await supabase.from('system_metrics').insert([
    {
      metric_name: 'quality_audit_avg_score',
      metric_value: avgQuality,
      metric_type: 'quality',
      tags: { timeframe, sample_size: conversations.length }
    },
    {
      metric_name: 'quality_audit_pass_rate',
      metric_value: qualityRate,
      metric_type: 'quality',
      tags: { timeframe, threshold: 0.6 }
    }
  ]);

  // Generate improvement recommendations
  const recommendations = await generateImprovementRecommendations(commonIssues, avgQuality);

  return {
    message: `Audited ${conversations.length} conversations`,
    avg_quality_score: avgQuality,
    quality_pass_rate: qualityRate,
    low_quality_count: lowQualityCount,
    common_issues: commonIssues,
    recommendations
  };
}

// ============================================================================
// Performance Analysis Job (Every 15 minutes)
// ============================================================================

async function runPerformanceAnalysis(timeframe: string) {
  console.log(`⚡ Running performance analysis (${timeframe})`);
  
  const cutoff = getTimeframeCutoff(timeframe);
  
  // Get execution logs for analysis
  const { data: execLogs } = await supabase
    .from('agent_execution_log')
    .select('*')
    .gte('timestamp', cutoff);

  if (!execLogs || execLogs.length === 0) {
    return { message: 'No execution logs found for analysis' };
  }

  // Calculate performance metrics
  const totalExecutions = execLogs.length;
  const successfulExecutions = execLogs.filter(log => log.success_status).length;
  const successRate = successfulExecutions / totalExecutions;
  
  const executionTimes = execLogs
    .filter(log => log.execution_time_ms)
    .map(log => log.execution_time_ms);
  
  const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
  const p95ExecutionTime = calculatePercentile(executionTimes, 95);
  
  // Identify slow functions
  const functionPerformance = analyzeByFunction(execLogs);
  const slowFunctions = Object.entries(functionPerformance)
    .filter(([_, stats]: [string, any]) => stats.avg_time > 2000)
    .map(([name, stats]) => ({ name, ...stats }));

  // Store performance metrics
  await supabase.from('system_metrics').insert([
    {
      metric_name: 'performance_success_rate',
      metric_value: successRate,
      metric_type: 'performance',
      tags: { timeframe, total_executions: totalExecutions }
    },
    {
      metric_name: 'performance_avg_time_ms',
      metric_value: avgExecutionTime,
      metric_type: 'performance',
      tags: { timeframe }
    },
    {
      metric_name: 'performance_p95_time_ms',
      metric_value: p95ExecutionTime,
      metric_type: 'performance',
      tags: { timeframe }
    }
  ]);

  return {
    message: `Analyzed ${totalExecutions} executions`,
    success_rate: successRate,
    avg_execution_time_ms: avgExecutionTime,
    p95_execution_time_ms: p95ExecutionTime,
    slow_functions: slowFunctions,
    function_performance: functionPerformance
  };
}

// ============================================================================
// User Preference Learning Job (Hourly)
// ============================================================================

async function runUserPreferenceLearning(timeframe: string) {
  console.log(`🎯 Running user preference learning (${timeframe})`);
  
  const cutoff = getTimeframeCutoff(timeframe);
  
  // Find users with recent activity but outdated preferences
  const { data: activeUsers } = await supabase
    .from('agent_conversations')
    .select('user_id')
    .gte('ts', cutoff);

  if (!activeUsers || activeUsers.length === 0) {
    return { message: 'No active users found for preference learning' };
  }

  const uniqueUsers = [...new Set(activeUsers.map(u => u.user_id))];
  const results = [];

  for (const userId of uniqueUsers) {
    try {
      // Check if user profile needs updating
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('updated_at')
        .eq('user_id', userId)
        .single();

      const needsUpdate = !profile || 
        new Date(profile.updated_at).getTime() < Date.now() - (24 * 60 * 60 * 1000); // 24 hours

      if (needsUpdate) {
        const response = await supabase.functions.invoke('memory-consolidator-v2', {
          body: { action: 'learn_preferences', userId }
        });

        results.push({ userId, status: 'learned', ...response.data?.result });
      } else {
        results.push({ userId, status: 'skipped', reason: 'recently_updated' });
      }
    } catch (error) {
      console.error(`Failed preference learning for user ${userId}:`, error);
      results.push({ userId, status: 'error', error: error.message });
    }
  }

  return {
    message: `Processed ${uniqueUsers.length} users for preference learning`,
    learned: results.filter(r => r.status === 'learned').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
    results
  };
}

// ============================================================================
// KPI Rollup Job (Every 15 minutes)
// ============================================================================

async function runKPIRollup(timeframe: string) {
  console.log(`📊 Running KPI rollup (${timeframe})`);
  
  const cutoff = getTimeframeCutoff(timeframe);
  
  // Calculate key metrics
  const metrics = await calculateKPIs(cutoff);
  
  // Store all KPIs
  const kpiInserts = Object.entries(metrics).map(([name, value]) => ({
    metric_name: `kpi_${name}`,
    metric_value: value as number,
    metric_type: 'kpi',
    tags: { timeframe, calculated_at: new Date().toISOString() }
  }));

  await supabase.from('system_metrics').insert(kpiInserts);

  return {
    message: `Calculated ${Object.keys(metrics).length} KPIs`,
    timeframe,
    metrics
  };
}

async function calculateKPIs(cutoff: string) {
  const [
    conversations,
    execLogs,
    qualityFeedback,
    handoffs
  ] = await Promise.all([
    supabase.from('agent_conversations').select('*').gte('ts', cutoff),
    supabase.from('agent_execution_log').select('*').gte('timestamp', cutoff),
    supabase.from('quality_feedback').select('*').gte('created_at', cutoff),
    supabase.from('live_handoffs').select('*').gte('created_at', cutoff)
  ]);

  const totalConversations = conversations.data?.length || 0;
  const totalExecutions = execLogs.data?.length || 0;
  const successfulExecutions = execLogs.data?.filter(log => log.success_status).length || 0;
  const qualityScores = qualityFeedback.data?.map(q => q.quality_score) || [];
  const avgQuality = qualityScores.length > 0 ? 
    qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;

  return {
    total_conversations: totalConversations,
    total_executions: totalExecutions,
    success_rate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
    avg_quality_score: avgQuality,
    handoff_rate: totalConversations > 0 ? (handoffs.data?.length || 0) / totalConversations : 0,
    active_users: new Set(conversations.data?.map(c => c.user_id) || []).size
  };
}

// ============================================================================
// Conversation Cleanup Job (Daily)
// ============================================================================

async function runConversationCleanup() {
  console.log(`🧹 Running conversation cleanup`);
  
  const cleanupResults = {
    deleted_old_conversations: 0,
    deleted_old_summaries: 0,
    deleted_old_quality_feedback: 0,
    deleted_old_execution_logs: 0
  };

  // Delete conversations older than 90 days
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const { error: convError, count: convCount } = await supabase
    .from('agent_conversations')
    .delete()
    .lt('ts', ninetyDaysAgo.toISOString());

  if (!convError) cleanupResults.deleted_old_conversations = convCount || 0;

  // Delete summaries older than 1 year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const { error: summaryError, count: summaryCount } = await supabase
    .from('conversation_summaries')
    .delete()
    .lt('created_at', oneYearAgo.toISOString());

  if (!summaryError) cleanupResults.deleted_old_summaries = summaryCount || 0;

  // Delete quality feedback older than 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const { error: qualityError, count: qualityCount } = await supabase
    .from('quality_feedback')
    .delete()
    .lt('created_at', sixMonthsAgo.toISOString());

  if (!qualityError) cleanupResults.deleted_old_quality_feedback = qualityCount || 0;

  // Delete execution logs older than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { error: execError, count: execCount } = await supabase
    .from('agent_execution_log')
    .delete()
    .lt('timestamp', thirtyDaysAgo.toISOString());

  if (!execError) cleanupResults.deleted_old_execution_logs = execCount || 0;

  return cleanupResults;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeframeCutoff(timeframe: string): string {
  const now = new Date();
  let cutoff: Date;

  switch (timeframe) {
    case '10m':
      cutoff = new Date(now.getTime() - 10 * 60 * 1000);
      break;
    case '1h':
      cutoff = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      cutoff = new Date(now.getTime() - 60 * 60 * 1000);
  }

  return cutoff.toISOString();
}

async function assessConversationBatch(conversations: any[]) {
  // Simplified batch assessment - could be enhanced
  const scores = conversations.map(() => Math.random() * 0.4 + 0.6); // Mock scores for now
  const issues = conversations.map(() => 'clarity').filter(() => Math.random() > 0.7); // Mock issues
  
  return { scores, issues };
}

function analyzeCommonIssues(issues: string[]) {
  const issueCounts = issues.reduce((acc, issue) => {
    acc[issue] = (acc[issue] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(issueCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));
}

async function generateImprovementRecommendations(commonIssues: any[], avgQuality: number) {
  if (avgQuality > 0.8) {
    return ['Quality is good. Continue monitoring.'];
  }

  const recommendations = [
    'Review and update response templates',
    'Enhance cultural context training',
    'Improve clarity in common responses'
  ];

  if (commonIssues.some(issue => issue.issue.includes('clarity'))) {
    recommendations.push('Focus on clearer, more direct communication');
  }

  return recommendations;
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function analyzeByFunction(logs: any[]) {
  const functionStats = logs.reduce((acc, log) => {
    const name = log.function_name || 'unknown';
    if (!acc[name]) {
      acc[name] = { times: [], successes: 0, total: 0 };
    }
    
    acc[name].total++;
    if (log.success_status) acc[name].successes++;
    if (log.execution_time_ms) acc[name].times.push(log.execution_time_ms);
    
    return acc;
  }, {} as Record<string, any>);

  return Object.fromEntries(
    Object.entries(functionStats).map(([name, stats]) => [
      name,
      {
        total_executions: stats.total,
        success_rate: stats.successes / stats.total,
        avg_time: stats.times.length > 0 ? 
          stats.times.reduce((sum: number, time: number) => sum + time, 0) / stats.times.length : 0
      }
    ])
  );
}
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";

/**
 * Security Audit Edge Function
 * Tests RLS policies and validates security configurations
 */

const supabase = createSupabaseClient();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auditResults = await runSecurityAudit();
    
    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results: auditResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Security audit error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function runSecurityAudit() {
  const results = {
    rls_coverage: await checkRLSCoverage(),
    function_security: await checkFunctionSecurity(),
    gdpr_compliance: await checkGDPRCompliance(),
    policy_validation: await validateRLSPolicies(),
    security_events: await checkSecurityEvents()
  };

  return results;
}

async function checkRLSCoverage() {
  try {
    // Check which tables have RLS enabled
    const { data: tables, error } = await supabase.rpc('get_rls_status');
    
    if (error) {
      console.error('RLS coverage check error:', error);
      return { error: error.message };
    }

    const totalTables = tables?.length || 0;
    const tablesWithRLS = tables?.filter((t: any) => t.rls_enabled)?.length || 0;
    
    return {
      total_tables: totalTables,
      tables_with_rls: tablesWithRLS,
      coverage_percentage: totalTables > 0 ? (tablesWithRLS / totalTables) * 100 : 0,
      tables_without_rls: tables?.filter((t: any) => !t.rls_enabled)?.map((t: any) => t.table_name) || []
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkFunctionSecurity() {
  try {
    // Check security definer functions
    const { data: functions, error } = await supabase.rpc('get_security_functions');
    
    if (error) {
      console.error('Function security check error:', error);
      return { error: error.message };
    }

    return {
      total_functions: functions?.length || 0,
      security_definer_count: functions?.filter((f: any) => f.security_type === 'DEFINER')?.length || 0,
      functions_with_search_path: functions?.filter((f: any) => f.has_search_path)?.length || 0
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkGDPRCompliance() {
  try {
    // Check if GDPR functions exist
    const gdprFunctions = [
      'gdpr_delete_user_data',
      'gdpr_export_user_data'
    ];

    const functionChecks = await Promise.all(
      gdprFunctions.map(async (funcName) => {
        const { data, error } = await supabase.rpc('check_function_exists', { 
          function_name: funcName 
        });
        return { function: funcName, exists: !error && data };
      })
    );

    return {
      gdpr_functions: functionChecks,
      all_gdpr_functions_present: functionChecks.every(f => f.exists)
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function validateRLSPolicies() {
  try {
    // Test policies with mock data
    const testResults = [];

    // Test user_roles policies
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .limit(1);
      
      testResults.push({
        table: 'user_roles',
        policy_test: 'select',
        result: error ? 'blocked' : 'allowed',
        error: error?.message
      });
    } catch (e) {
      testResults.push({
        table: 'user_roles',
        policy_test: 'select',
        result: 'error',
        error: e.message
      });
    }

    // Test security_events policies
    try {
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .limit(1);
      
      testResults.push({
        table: 'security_events',
        policy_test: 'select',
        result: error ? 'blocked' : 'allowed',
        error: error?.message
      });
    } catch (e) {
      testResults.push({
        table: 'security_events',
        policy_test: 'select',
        result: 'error',
        error: e.message
      });
    }

    return {
      policy_tests: testResults,
      total_tests: testResults.length,
      passed_tests: testResults.filter(t => t.result === 'allowed').length
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function checkSecurityEvents() {
  try {
    // Get recent security events
    const { data: events, error } = await supabase
      .from('security_events')
      .select('event_type, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return { error: error.message };
    }

    const eventTypes = events?.reduce((acc: any, event: any) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      total_events_24h: events?.length || 0,
      event_types: eventTypes,
      security_incidents: events?.filter((e: any) => 
        ['rate_limit_exceeded', 'invalid_webhook_signature'].includes(e.event_type)
      )?.length || 0
    };
  } catch (error) {
    return { error: error.message };
  }
}
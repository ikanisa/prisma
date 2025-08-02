import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, testPhone } = await req.json();
    const results: any = {};

    if (action === 'full_test' || action === 'env_check') {
      // ✅ 1. Check environment variables
      const envVars = [
        'META_WABA_VERIFY_TOKEN',
        'META_WABA_WEBHOOK_SECRET', 
        'WHATSAPP_VERIFY_TOKEN',
        'WHATSAPP_WEBHOOK_SECRET',
        'WA_VERIFY_TOKEN',
        'WHATSAPP_ACCESS_TOKEN',
        'WHATSAPP_PHONE_ID',
        'META_WABA_TOKEN',
        'META_WABA_PHONE_ID'
      ];

      results.environment = {};
      for (const envVar of envVars) {
        const value = Deno.env.get(envVar);
        results.environment[envVar] = {
          configured: !!value,
          valuePreview: value ? `${value.substring(0, 8)}...` : null
        };
      }
    }

    if (action === 'full_test' || action === 'database_check') {
      // ✅ 2. Check database tables
      results.database = {};

      const tables = [
        'conversation_messages',
        'contacts', 
        'whatsapp_logs',
        'whatsapp_messages',
        'incoming_messages'
      ];

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          results.database[table] = {
            exists: !error,
            error: error?.message,
            totalRecords: data?.length || 0
          };
        } catch (err) {
          results.database[table] = {
            exists: false,
            error: err.message
          };
        }
      }
    }

    if (action === 'full_test' || action === 'webhook_test') {
      // ✅ 3. Test webhook URLs
      results.webhooks = {};
      
      const webhookFunctions = [
        'whatsapp-webhook'
      ];

      const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '') || '';
      
      for (const funcName of webhookFunctions) {
        const url = `${baseUrl}/functions/v1/${funcName}`;
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            }
          });
          
          results.webhooks[funcName] = {
            url,
            accessible: response.status < 500,
            status: response.status,
            statusText: response.statusText
          };
        } catch (err) {
          results.webhooks[funcName] = {
            url,
            accessible: false,
            error: err.message
          };
        }
      }
    }

    if (action === 'full_test' || action === 'simulate_message') {
      // ✅ 4. Simulate WhatsApp message
      const phone = testPhone || '+250795467385';
      const testMessage = 'Test message from webhook diagnostic';
      
      try {
        const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
          body: {
            entry: [{
              changes: [{
                value: {
                  messages: [{
                    id: `test_${Date.now()}`,
                    from: phone,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    type: 'text',
                    text: { body: testMessage }
                  }],
                  contacts: [{
                    wa_id: phone,
                    profile: { name: 'Test Contact' }
                  }]
                }
              }]
            }]
          }
        });

        results.messageSimulation = {
          success: !error,
          data,
          error: error?.message
        };

        // Check if message was saved
        const { data: savedMessage } = await supabase
          .from('conversation_messages')
          .select('*')
          .eq('phone_number', phone)
          .order('created_at', { ascending: false })
          .limit(1);

        results.messageSimulation.messageSaved = !!savedMessage?.length;
        results.messageSimulation.savedMessage = savedMessage?.[0];

      } catch (err) {
        results.messageSimulation = {
          success: false,
          error: err.message
        };
      }
    }

    if (action === 'full_test' || action === 'recent_messages') {
      // ✅ 5. Check recent messages
      const phone = testPhone || '+250795467385';
      
      const { data: recentMessages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('phone_number', phone)
        .order('created_at', { ascending: false })
        .limit(10);

      results.recentMessages = {
        count: recentMessages?.length || 0,
        messages: recentMessages || []
      };
    }

    // ✅ Overall diagnosis
    results.diagnosis = {
      envConfigured: Object.values(results.environment || {}).some((env: any) => env.configured),
      databaseHealthy: Object.values(results.database || {}).every((db: any) => db.exists),
      webhookAccessible: Object.values(results.webhooks || {}).some((wh: any) => wh.accessible),
      messagesReceived: (results.recentMessages?.count || 0) > 0,
      overallHealth: 'unknown'
    };

    // Calculate overall health
    const { envConfigured, databaseHealthy, webhookAccessible, messagesReceived } = results.diagnosis;
    
    if (envConfigured && databaseHealthy && webhookAccessible && messagesReceived) {
      results.diagnosis.overallHealth = 'healthy';
    } else if (envConfigured && databaseHealthy && webhookAccessible) {
      results.diagnosis.overallHealth = 'configured_but_no_messages';
    } else if (envConfigured && databaseHealthy) {
      results.diagnosis.overallHealth = 'database_ready_webhook_issues';
    } else {
      results.diagnosis.overallHealth = 'critical_issues';
    }

    // Recommendations
    results.recommendations = [];
    
    if (!envConfigured) {
      results.recommendations.push({
        priority: 'HIGH',
        issue: 'Missing environment variables',
        action: 'Configure META_WABA_VERIFY_TOKEN, META_WABA_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, and WHATSAPP_PHONE_ID in Supabase Edge Function Secrets'
      });
    }

    if (!webhookAccessible) {
      results.recommendations.push({
        priority: 'HIGH',
        issue: 'Webhook function not accessible',
        action: 'Ensure whatsapp-webhook function is deployed and publicly accessible'
      });
    }

    if (!messagesReceived && envConfigured && webhookAccessible) {
      results.recommendations.push({
        priority: 'MEDIUM',
        issue: 'Webhook configured but no messages received',
        action: 'Check WhatsApp Business API webhook URL configuration and verify phone number approval'
      });
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
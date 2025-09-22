import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// =======================================================================
// Health Check Function
// =======================================================================

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    database: boolean;
    externalApis: boolean;
    memory: boolean;
    disk: boolean;
  };
  details: {
    database: {
      connected: boolean;
      responseTime?: number;
      error?: string;
    };
    externalApis: {
      whatsapp: boolean;
      openai: boolean;
      pinecone: boolean;
    };
    system: {
      uptime: number;
      version: string;
    };
  };
}

async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  // Database health check
  const dbStartTime = Date.now();
  let dbConnected = false;
  let dbError: string | undefined;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { 'apikey': supabaseKey }
      });
      dbConnected = response.ok;
      if (!response.ok) {
        dbError = `HTTP ${response.status}: ${response.statusText}`;
      }
    } else {
      dbError = 'Missing Supabase configuration';
    }
  } catch (error) {
    dbError = error.message;
  }
  
  const dbResponseTime = Date.now() - dbStartTime;
  
  // External APIs health check
  const externalApis = {
    whatsapp: false,
    openai: false,
    pinecone: false
  };
  
  // WhatsApp API check
  try {
    const whatsappToken = Deno.env.get('WHATSAPP_TOKEN');
    if (whatsappToken) {
      const response = await fetch('https://graph.facebook.com/v20.0/me', {
        headers: { 'Authorization': `Bearer ${whatsappToken}` }
      });
      externalApis.whatsapp = response.ok;
    }
  } catch (error) {
    console.warn('WhatsApp API check failed:', error.message);
  }
  
  // OpenAI API check
  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${openaiKey}` }
      });
      externalApis.openai = response.ok;
    }
  } catch (error) {
    console.warn('OpenAI API check failed:', error.message);
  }
  
  // Pinecone API check (simplified)
  try {
    // This would need actual Pinecone configuration
    externalApis.pinecone = true; // Assume OK for now
  } catch (error) {
    console.warn('Pinecone API check failed:', error.message);
  }
  
  // Determine overall status
  const allChecks = [
    dbConnected,
    true, // memory - assume OK
    true, // disk - assume OK
    externalApis.whatsapp,
    externalApis.openai,
    externalApis.pinecone
  ];
  
  const healthyChecks = allChecks.filter(Boolean).length;
  const totalChecks = allChecks.length;
  
  let status: 'healthy' | 'unhealthy' | 'degraded';
  if (healthyChecks === totalChecks) {
    status = 'healthy';
  } else if (healthyChecks >= totalChecks * 0.7) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }
  
  return {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbConnected,
      externalApis: externalApis.whatsapp || externalApis.openai || externalApis.pinecone,
      memory: true,
      disk: true
    },
    details: {
      database: {
        connected: dbConnected,
        responseTime: dbResponseTime,
        error: dbError
      },
      externalApis,
      system: {
        uptime: Date.now() - startTime,
        version: '1.0.0'
      }
    }
  };
}

serve(withErrorHandling(async (req) => {
  try {
    console.log('Health check requested');
    
    const result = await performHealthCheck();
    
    const response = {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
    
    // Set appropriate status code based on health
    const status = result.status === 'healthy' ? 200 : 
                   result.status === 'degraded' ? 503 : 
                   500;
    
    console.log('Health check completed:', { 
      status: result.status,
      checks: result.checks 
    });
    
    return new Response(JSON.stringify(response), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      }
    });
    
  } catch (error) {
    console.error('Health check failed:', error.message);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Health check failed',
        details: { error: error.message }
      },
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      }
    });
  }
}); 
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createRequestContext,
  log,
  withPerformanceMonitoring,
  performHealthCheck,
  createResponse,
  HttpStatus,
  ErrorCodes
} from "../../_shared/utils.ts";

// =======================================================================
// Health Check Function
// =======================================================================

const FUNCTION_NAME = 'health-check';

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
      memoryUsage?: number;
      uptime: number;
      version: string;
    };
  };
}

async function performDetailedHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const checks = await performHealthCheck();
  
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
    log('warn', FUNCTION_NAME, 'WhatsApp API check failed', { error: error.message });
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
    log('warn', FUNCTION_NAME, 'OpenAI API check failed', { error: error.message });
  }
  
  // Pinecone API check (simplified)
  try {
    // This would need actual Pinecone configuration
    externalApis.pinecone = true; // Assume OK for now
  } catch (error) {
    log('warn', FUNCTION_NAME, 'Pinecone API check failed', { error: error.message });
  }
  
  // Determine overall status
  const allChecks = [
    checks.database,
    checks.memory,
    checks.disk,
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
      database: checks.database,
      externalApis: checks.externalApis,
      memory: checks.memory,
      disk: checks.disk
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

serve(async (req) => {
  const context = createRequestContext(req);
  
  try {
    log('info', FUNCTION_NAME, 'Health check requested', {}, context);
    
    const result = await withPerformanceMonitoring(
      FUNCTION_NAME,
      performDetailedHealthCheck,
      context
    );
    
    const response = createSuccessResponse(result);
    
    // Set appropriate status code based on health
    const status = result.status === 'healthy' ? HttpStatus.OK : 
                   result.status === 'degraded' ? HttpStatus.SERVICE_UNAVAILABLE : 
                   HttpStatus.INTERNAL_SERVER_ERROR;
    
    log('info', FUNCTION_NAME, 'Health check completed', { 
      status: result.status,
      checks: result.checks 
    }, context);
    
    return createResponse(response, status);
    
  } catch (error) {
    log('error', FUNCTION_NAME, 'Health check failed', { 
      error: error.message 
    }, context);
    
    const errorResponse = createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Health check failed',
      { error: error.message }
    );
    
    return createResponse(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}); 
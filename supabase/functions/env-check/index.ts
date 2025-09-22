import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
/**
 * Environment Variables Status Check API
 * Admin-only endpoint to verify environment configuration
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";
import { getSupabaseClient } from "../_shared/supabase.ts";
import { getEnvStatus, validateRequiredEnvVars } from "../_shared/env.ts";
import { logger } from "../_shared/logger.ts";

const supabase = getSupabaseClient();

serve(withErrorHandling(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authorization required', null, 401);
    }

    // Check if user is admin using service role or admin function
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    
    if (adminError || !isAdmin) {
      logger.warn('Unauthorized env-check access attempt', { 
        hasAuth: !!authHeader,
        isAdmin: !!isAdmin,
        error: adminError?.message 
      });
      return createErrorResponse('Admin access required', null, 403);
    }

    // Get environment status
    const envStatus = getEnvStatus();
    const validation = validateRequiredEnvVars();
    
    logger.info('Environment status checked by admin', {
      missingCount: validation.missing.length,
      totalVars: Object.keys(envStatus).length
    });

    return createSuccessResponse({
      status: envStatus,
      summary: {
        total: Object.keys(envStatus).length,
        configured: Object.values(envStatus).filter(Boolean).length,
        missing: validation.missing.length,
        isValid: validation.isValid
      },
      missing: validation.missing
    });

  } catch (error) {
    logger.error('Env check API error', error);
    return createErrorResponse('Internal server error', null, 500);
  }
});
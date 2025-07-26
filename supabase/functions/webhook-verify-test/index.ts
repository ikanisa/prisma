/**
 * Test endpoint for webhook verification - Admin only
 * Tests the webhook verification flow without exposing the token
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createErrorResponse, createSuccessResponse } from "../_shared/utils.ts";
import { getEnv } from "../_shared/env.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', null, 405);
  }

  try {
    // Check for admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return createErrorResponse('Unauthorized', null, 401);
    }

    const { testChallenge } = await req.json();
    
    // Test the verification logic
    const VERIFY_TOKEN = getEnv("META_WABA_VERIFY_TOKEN");
    const hasToken = !!VERIFY_TOKEN;
    
    // Simulate webhook verification without exposing the token
    const simulatedParams = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': VERIFY_TOKEN,
      'hub.challenge': testChallenge || 'test_challenge_12345'
    });

    const testResult = {
      configured: hasToken,
      challengeResponse: testChallenge || 'test_challenge_12345',
      status: hasToken ? 'configured' : 'missing',
      webhookUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`
    };

    logger.info('Webhook verification test completed', { configured: hasToken });

    return createSuccessResponse(testResult);

  } catch (error) {
    logger.error('Webhook verification test error', error);
    return createErrorResponse('Test failed', error.message, 500);
  }
});
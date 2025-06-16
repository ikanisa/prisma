
/**
 * Validation Utility
 * Handles input validation and error responses
 */

export interface ValidationResult {
  isValid: boolean;
  errorResponse?: Response;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function validateInput(receiver: string, amount: string, sessionId: string): ValidationResult {
  if (!receiver || !amount || !sessionId) {
    return {
      isValid: false,
      errorResponse: new Response(
        JSON.stringify({ 
          error: 'Missing required fields: receiver, amount, sessionId',
          code: 'MISSING_FIELDS'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    };
  }

  return { isValid: true };
}

export function createErrorResponse(error: string, code: string, details?: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ 
      error,
      code,
      ...(details && { details })
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    }
  );
}

export function createSuccessResponse(data: any): Response {
  return new Response(
    JSON.stringify(data),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

export { corsHeaders };

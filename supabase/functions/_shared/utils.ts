export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createSuccessResponse(message: string, data?: any) {
  return new Response(
    JSON.stringify({
      success: true,
      message,
      data
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    }
  );
}

export function createErrorResponse(message: string, details?: any, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
      details
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status
    }
  );
}
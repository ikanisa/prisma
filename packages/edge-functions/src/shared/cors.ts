// Standard CORS headers for Supabase Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
} as const;

// Handle CORS preflight requests
export function handleCorsPreflightRequest(): Response {
  return new Response(null, { 
    status: 200, 
    headers: corsHeaders 
  });
}

// Create response with CORS headers
export function createCorsResponse(
  body: string | null,
  init?: ResponseInit
): Response {
  return new Response(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}
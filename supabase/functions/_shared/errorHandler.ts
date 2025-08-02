// Centralized error handling middleware for Supabase Edge Functions
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (err: unknown) {
      console.error('Unhandled error in function:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  };
}

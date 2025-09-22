/**
 * Minimal declaration for Supabase Edge Functions Deno serve API
 */
declare module 'std/server' {
  /**
   * Serve HTTP requests in a Supabase Edge Function
   */
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

declare module 'std/server' {
  /** Serve HTTP requests in Supabase Edge Function */
  export function serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withErrorHandling } from "../_shared/errorHandler.ts";

serve(withErrorHandling(async (req: Request) => {
  return new Response("register-user not implemented", { status: 501 });
}));

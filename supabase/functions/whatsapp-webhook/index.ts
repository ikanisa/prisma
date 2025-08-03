import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withErrorHandling } from "../_shared/errorHandler.ts";

serve(withErrorHandling(async (req: Request) => {
  // Handle WhatsApp webhook verification handshake (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  // TODO: parse POST payload and forward to OmniAgent routing
  return new Response('Webhook received', { status: 200 });
}));

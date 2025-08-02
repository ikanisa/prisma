import { supabaseClient } from "./client.ts";
import { assertEquals } from 'https://deno.land/std@0.224.0/testing/asserts.ts';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import router from '../whatsapp-webhook/index.ts';

Deno.test('whatsapp-webhook POST returns 200', async () => {
  const req = new Request('http://localhost', { method: 'POST', body: '{}' });
  const res = await serve(router, req);
  assertEquals(res.status, 200);
});

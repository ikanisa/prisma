import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { openaiAgent } from './openai-agent';
import { ensureUserExists } from './ensure-user-exists';
import { env } from '../utils/env';

// Supabase client with service role for secure DB access
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Main handler for WhatsApp webhook events.
 */
export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge') || '';
    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const msg = change.value?.messages?.[0];
        if (msg && msg.type === 'text') {
          const from = msg.from;
          const text = msg.text.body;

          // Ensure user record exists
          const { id: user_id } = await ensureUserExists(from);

          // Upsert thread
          const { data: thread } = await supabase
            .from('threads')
            .select('id')
            .eq('user_id', user_id)
            .limit(1)
            .single();
          let thread_id = thread?.id;
          if (!thread_id) {
            const { data: newThread } = await supabase
              .from('threads')
              .insert({ user_id })
              .select('id')
              .single();
            thread_id = newThread?.id;
          }
          if (!thread_id) continue;

          // Log incoming & process via agent
          await supabase.from('incoming_messages').insert({ thread_id, sender: from, body: text });
          const reply = await openaiAgent(thread_id, text);
          const content = reply.content ?? '';

          // Send & log outgoing
          await fetch(
            `https://graph.facebook.com/v17.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: from,
                type: 'text',
                text: { body: content }
              })
            }
          );
          await supabase.from('outgoing_messages').insert({ thread_id, body: content, status: 'sent' });
        }
      }
    }
    return new Response('OK', { status: 200 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}

// Start the Edge Function
serve(handler);

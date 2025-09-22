import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { env } from '../utils/env';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

/** Function-calling definitions for OpenAI Assistant SDK */
export const tools = [
  {
    name: 'fetch_history',
    description: 'Retrieve recent messages in this thread',
    parameters: {
      type: 'object',
      properties: {
        thread_id: { type: 'string' },
        limit: { type: 'number', description: 'Max number of messages' }
      },
      required: ['thread_id']
    }
  },
  {
    name: 'store_memory',
    description: 'Store a memory entry for the assistant in this thread',
    parameters: {
      type: 'object',
      properties: {
        thread_id: { type: 'string' },
        memory: { type: 'string', description: 'Detail to store in memory' }
      },
      required: ['thread_id', 'memory']
    }
  },
  {
    name: 'send_whatsapp',
    description: 'Send a WhatsApp message via the Business API',
    parameters: {
      type: 'object',
      properties: {
        thread_id: { type: 'string' },
        message: { type: 'string', description: 'Text to send to the user' }
      },
      required: ['thread_id', 'message']
    }
  }
];

/** Handlers invoked when GPT calls a tool */
export const toolHandlers: Record<string, Function> = {
  fetch_history: async ({ thread_id, limit = 10 }: { thread_id: string; limit?: number }) => {
    // Gather incoming and outgoing messages
    const [{ data: inc }, { data: out }] = await Promise.all([
      supabase
        .from('incoming_messages')
        .select('body, created_at')
        .eq('thread_id', thread_id)
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('outgoing_messages')
        .select('body, created_at')
        .eq('thread_id', thread_id)
        .order('created_at', { ascending: false })
        .limit(limit)
    ]);
    const combined = [
      ...(inc || []).map(m => ({ role: 'user', text: m.body })),
      ...(out || []).map(m => ({ role: 'assistant', text: m.body }))
    ];
    // Return sorted by time
    const msgs = combined
      .sort((a, b) => a.text.localeCompare(b.text))
      .slice(0, limit);
    return { messages: msgs };
  },
  store_memory: async ({ thread_id, memory }: { thread_id: string; memory: string }) => {
    // Create embedding and save vector
    const embedRes = await openai.embeddings.create({ model: 'text-embedding-ada-002', input: memory });
    const vector = embedRes.data[0].embedding;
    await supabase.from('agent_memory').insert({ thread_id, memory, memory_vector: vector });
    return { success: true };
  },
  send_whatsapp: async ({ thread_id, message }: { thread_id: string; message: string }) => {
    // Lookup user phone number
    const { data: thread } = await supabase.from('threads').select('user_id').eq('id', thread_id).single();
    const { data: user } = await supabase.from('users').select('phone').eq('id', thread?.user_id).single();
    if (!user) throw new Error('User not found for thread ' + thread_id);
    // Send via WhatsApp API
    await fetch(
      `https://graph.facebook.com/v17.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: user.phone,
          type: 'text',
          text: { body: message }
        })
      }
    );
    // Record outgoing message
    await supabase.from('outgoing_messages').insert({ thread_id, body: message, status: 'sent' });
    return { success: true };
  }
};

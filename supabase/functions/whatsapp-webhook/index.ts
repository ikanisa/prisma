import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const VERIFY_TOKEN = Deno.env.get('META_WABA_VERIFY_TOKEN') || Deno.env.get('WHATSAPP_VERIFY_TOKEN') || 'bd0e7b6f4a2c9d83f1e57a0c6b3d48e9'

function extractMessageText(message: any): string {
  if (message.text?.body) {
    return message.text.body;
  }
  if (message.type === "reaction" && message.reaction?.emoji) {
    return `Reaction: ${message.reaction.emoji}`;
  }
  if (message.type === "image" && message.image?.caption) {
    return message.image.caption;
  }
  if (message.type === "sticker") {
    return "[Sticker received]";
  }
  if (Array.isArray(message.errors) && message.errors.length > 0) {
    const err = message.errors[0];
    return `[Unsupported message] ${err.title ?? "Unknown"}`;
  }
  return `[${message.type ?? "unknown"} message received]`;
}

serve(async (req) => {
  const { method, url } = req
  const { searchParams } = new URL(url)

  // ✅ STEP 1: Meta verification
  if (method === 'GET') {
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Forbidden', { status: 403 })
    }
  }

  // ✅ STEP 2: Handle incoming messages
  if (method === 'POST') {
    try {
      const body = await req.json()
      console.log('📥 Webhook payload:', JSON.stringify(body, null, 2))

      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
      if (message) {
        const phone = message.from
        const messageText = extractMessageText(message)

        console.log('📞 Processing message:', { phone, messageText, type: message.type })

        // Save to Supabase with status 'received' for processing
        const { data, error } = await supabase.from('incoming_messages').insert({
          phone_number: phone,
          message: messageText,
          status: 'received'
        })

        if (error) {
          console.error('❌ Insert failed:', error.message)
          // Don't return error to WhatsApp - we want to acknowledge receipt
        } else {
          console.log('✅ Message saved to incoming_messages:', data)
        }
      } else {
        console.log('⚠️ No valid message found in payload')
      }

      return new Response('OK', { status: 200 })
    } catch (err) {
      console.error('❌ Webhook error:', err.message)
      return new Response('Error', { status: 500 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})
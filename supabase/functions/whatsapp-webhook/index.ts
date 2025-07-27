import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
)

const VERIFY_TOKEN = 'bd0e7b6f4a2c9d83f1e57a0c6b3d48e9'

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
    const body = await req.json()

    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (message) {
      const phone = message.from
      const text = message.text?.body || ''

      // Save to Supabase
      await supabase.from('incoming_messages').insert({
        phone_number: phone,
        message: text,
        status: 'new'
      })
    }

    return new Response('OK', { status: 200 })
  }

  return new Response('Method Not Allowed', { status: 405 })
})

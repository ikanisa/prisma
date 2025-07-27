import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
// Simplified to avoid dependency issues
// import { getWhatsAppClient } from '../_shared/whatsapp.ts'
// import { WhatsAppEnv, OpenAIEnv, SupabaseEnv } from '../_shared/env.ts'
// import { logger } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client 
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('🔄 Processing incoming messages...')

    // STEP 1: Get the first new message
    const { data: messages, error: fetchError } = await supabase
      .from('incoming_messages')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(1)

    if (fetchError) {
      throw new Error(`Failed to fetch messages: ${fetchError.message}`)
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No new messages to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const latestMessage = messages[0]
    console.log('📨 Processing message', {
      phone: latestMessage.phone_number,
      messagePreview: latestMessage.message.substring(0, 50)
    })

    // STEP 2: Get AI response using OpenAI Assistant
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    const assistantId = 'asst_anmQpZHZJxr1JjrlohSyPSx1' // Your assistant ID

    // Create a thread and add the user message
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: latestMessage.message
          }
        ]
      })
    })

    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponse.statusText}`)
    }

    const thread = await threadResponse.json()
    console.log(`🧵 Created thread: ${thread.id}`)

    // Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    })

    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${runResponse.statusText}`)
    }

    const run = await runResponse.json()
    console.log(`🤖 Started assistant run: ${run.id}`)

    // Wait for completion (with timeout)
    let attempts = 0
    const maxAttempts = 30
    let runStatus = run.status

    while (runStatus === 'queued' || runStatus === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Assistant run timed out')
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      })

      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${statusResponse.statusText}`)
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.status
      attempts++
    }

    if (runStatus !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus}`)
    }

    // Get the assistant's response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    })

    if (!messagesResponse.ok) {
      throw new Error(`Failed to get messages: ${messagesResponse.statusText}`)
    }

    const messagesData = await messagesResponse.json()
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant')
    
    if (!assistantMessage || !assistantMessage.content[0]?.text?.value) {
      throw new Error('No assistant response found')
    }

    const aiReply = assistantMessage.content[0].text.value
    console.log('🤖 AI Response generated', { 
      responseLength: aiReply.length,
      preview: aiReply.substring(0, 100)
    })

    // STEP 3: Send reply via WhatsApp API
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    
    if (!whatsappPhoneId || !whatsappToken) {
      throw new Error('WHATSAPP_PHONE_ID and WHATSAPP_ACCESS_TOKEN environment variables are required')
    }

    const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: latestMessage.phone_number,
        type: 'text',
        text: { body: aiReply }
      })
    })

    if (!whatsappResponse.ok) {
      throw new Error(`Failed to send WhatsApp message: ${whatsappResponse.statusText}`)
    }
    
    console.log('📤 WhatsApp message sent successfully')

    // STEP 4: Mark message as processed
    const { error: updateError } = await supabase
      .from('incoming_messages')
      .update({ 
        status: 'processed',
        updated_at: new Date().toISOString()
      })
      .eq('id', latestMessage.id)

    if (updateError) {
      throw new Error(`Failed to update message status: ${updateError.message}`)
    }

    console.log('✅ Message processed successfully', {
      phone: latestMessage.phone_number,
      messageId: latestMessage.id
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Message processed successfully',
      phone_number: latestMessage.phone_number,
      original_message: latestMessage.message,
      ai_reply: aiReply,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error processing message:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
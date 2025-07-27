import { serve } from 'https://deno.land/std@0.170.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { getWhatsAppClient } from '../_shared/whatsapp.ts'
import { WhatsAppEnv, OpenAIEnv, SupabaseEnv } from '../_shared/env.ts'
import { logger } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with environment validation
    const supabase = createClient(
      SupabaseEnv.getUrl(),
      SupabaseEnv.getServiceRoleKey()
    )

    logger.info('🔄 Processing incoming messages...')

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
    logger.info('📨 Processing message', {
      phone: latestMessage.phone_number,
      messagePreview: latestMessage.message.substring(0, 50)
    })

    // STEP 2: Get AI response using OpenAI Assistant
    const openaiApiKey = OpenAIEnv.getApiKey()
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
    logger.info('🤖 AI Response generated', { 
      responseLength: aiReply.length,
      preview: aiReply.substring(0, 100)
    })

    // STEP 3: Send reply via WhatsApp API using shared client
    const whatsappClient = getWhatsAppClient()
    
    await whatsappClient.sendTextMessage(latestMessage.phone_number, aiReply)
    logger.info('📤 WhatsApp message sent successfully')

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

    logger.info('✅ Message processed successfully', {
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
    logger.error('❌ Error processing message:', error)
    
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
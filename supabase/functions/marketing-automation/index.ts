import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MarketingRequest {
  operation: 'send_campaign' | 'process_drip' | 'enroll_user' | 'get_campaigns'
  campaign_id?: string
  sequence_id?: string
  phone_number?: string
  trigger_event?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as MarketingRequest
    const { operation, campaign_id, sequence_id, phone_number, trigger_event } = body

    console.log('Marketing automation:', { operation, campaign_id, sequence_id, phone_number })

    let result
    switch (operation) {
      case 'send_campaign':
        result = await processCampaignMessages(supabase, campaign_id)
        break
      case 'process_drip':
        result = await processDripSequences(supabase)
        break
      case 'enroll_user':
        result = await enrollUserInSequence(supabase, sequence_id!, phone_number!, trigger_event)
        break
      case 'get_campaigns':
        result = await getCampaignStatus(supabase)
        break
      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        operation,
        result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Marketing automation error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processCampaignMessages(supabase: any, campaignId?: string) {
  const now = new Date().toISOString()
  
  // Get pending campaign messages
  let query = supabase
    .from('campaign_messages')
    .select(`
      *,
      marketing_campaigns(name, status)
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', now)

  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }

  const { data: pendingMessages, error } = await query.order('scheduled_for', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch pending messages: ${error.message}`)
  }

  if (!pendingMessages || pendingMessages.length === 0) {
    return {
      messages_processed: 0,
      message: 'No pending messages to send'
    }
  }

  console.log(`Processing ${pendingMessages.length} campaign messages`)

  const results = {
    messages_processed: 0,
    messages_sent: 0,
    messages_failed: 0,
    errors: []
  }

  for (const message of pendingMessages) {
    results.messages_processed++

    try {
      // Send message via WhatsApp
      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'compose-whatsapp-message',
        {
          body: {
            phone_number: message.phone_number,
            message: message.message_content,
            message_type: 'text',
            campaign_id: message.campaign_id,
            track_delivery: true
          }
        }
      )

      if (sendError) {
        throw new Error(`Failed to send message: ${sendError.message}`)
      }

      // Update message status
      await supabase
        .from('campaign_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempt_count: message.attempt_count + 1
        })
        .eq('id', message.id)

      // Update campaign statistics
      await supabase
        .from('marketing_campaigns')
        .update({
          total_sent: supabase.sql`total_sent + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', message.campaign_id)

      results.messages_sent++
      console.log(`Message sent to ${message.phone_number}`)

    } catch (error) {
      console.error(`Failed to send message to ${message.phone_number}:`, error)
      
      // Update message with error
      await supabase
        .from('campaign_messages')
        .update({
          status: 'failed',
          error_details: error.message,
          attempt_count: message.attempt_count + 1
        })
        .eq('id', message.id)

      results.messages_failed++
      results.errors.push({
        phone_number: message.phone_number,
        error: error.message
      })
    }

    // Small delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return results
}

async function processDripSequences(supabase: any) {
  const now = new Date().toISOString()
  
  // Get users due for next drip message
  const { data: dueEnrollments, error } = await supabase
    .from('drip_enrollments')
    .select(`
      *,
      drip_sequences(name, is_active),
      drip_steps!inner(
        step_order,
        delay_hours,
        message_template,
        template_variables,
        conditions,
        is_active
      )
    `)
    .eq('status', 'active')
    .lte('next_message_at', now)
    .eq('drip_sequences.is_active', true)
    .eq('drip_steps.is_active', true)
    .eq('drip_steps.step_order', supabase.sql`drip_enrollments.current_step + 1`)

  if (error) {
    throw new Error(`Failed to fetch due enrollments: ${error.message}`)
  }

  if (!dueEnrollments || dueEnrollments.length === 0) {
    return {
      enrollments_processed: 0,
      messages_sent: 0,
      message: 'No drip messages due'
    }
  }

  console.log(`Processing ${dueEnrollments.length} drip messages`)

  const results = {
    enrollments_processed: 0,
    messages_sent: 0,
    messages_failed: 0,
    sequences_completed: 0,
    errors: []
  }

  for (const enrollment of dueEnrollments) {
    results.enrollments_processed++

    try {
      const step = enrollment.drip_steps
      
      // Process message template with variables
      let messageContent = step.message_template
      
      // Simple template variable replacement
      if (step.template_variables) {
        for (const [key, value] of Object.entries(step.template_variables)) {
          messageContent = messageContent.replace(
            new RegExp(`{{${key}}}`, 'g'), 
            String(value)
          )
        }
      }

      // Send drip message
      const { data: sendResult, error: sendError } = await supabase.functions.invoke(
        'compose-whatsapp-message',
        {
          body: {
            phone_number: enrollment.phone_number,
            message: messageContent,
            message_type: 'text',
            drip_sequence_id: enrollment.sequence_id,
            drip_step: step.step_order,
            track_delivery: true
          }
        }
      )

      if (sendError) {
        throw new Error(`Failed to send drip message: ${sendError.message}`)
      }

      // Check if there's a next step
      const { data: nextStep } = await supabase
        .from('drip_steps')
        .select('step_order, delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_order', step.step_order + 1)
        .eq('is_active', true)
        .single()

      if (nextStep) {
        // Schedule next message
        const nextMessageTime = new Date(Date.now() + nextStep.delay_hours * 60 * 60 * 1000)
        
        await supabase
          .from('drip_enrollments')
          .update({
            current_step: step.step_order,
            next_message_at: nextMessageTime.toISOString()
          })
          .eq('id', enrollment.id)
      } else {
        // Complete the sequence
        await supabase
          .from('drip_enrollments')
          .update({
            current_step: step.step_order,
            status: 'completed',
            completed_at: new Date().toISOString(),
            next_message_at: null
          })
          .eq('id', enrollment.id)
        
        results.sequences_completed++
      }

      results.messages_sent++
      console.log(`Drip message sent to ${enrollment.phone_number} (step ${step.step_order})`)

    } catch (error) {
      console.error(`Failed to process drip for ${enrollment.phone_number}:`, error)
      
      // Log error but don't fail the enrollment completely
      results.messages_failed++
      results.errors.push({
        phone_number: enrollment.phone_number,
        sequence_id: enrollment.sequence_id,
        error: error.message
      })
    }

    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return results
}

async function enrollUserInSequence(supabase: any, sequenceId: string, phoneNumber: string, triggerEvent?: string) {
  // Get sequence details
  const { data: sequence, error: sequenceError } = await supabase
    .from('drip_sequences')
    .select(`
      *,
      drip_steps(step_order, delay_hours)
    `)
    .eq('id', sequenceId)
    .eq('is_active', true)
    .single()

  if (sequenceError) {
    throw new Error(`Failed to fetch sequence: ${sequenceError.message}`)
  }

  if (!sequence) {
    throw new Error('Sequence not found or inactive')
  }

  // Check if user is already enrolled
  const { data: existingEnrollment } = await supabase
    .from('drip_enrollments')
    .select('id, status')
    .eq('sequence_id', sequenceId)
    .eq('phone_number', phoneNumber)
    .single()

  if (existingEnrollment && existingEnrollment.status === 'active') {
    return {
      success: false,
      message: 'User already enrolled in this sequence',
      enrollment_id: existingEnrollment.id
    }
  }

  // Get first step timing
  const firstStep = sequence.drip_steps.find((step: any) => step.step_order === 1)
  const firstMessageTime = firstStep 
    ? new Date(Date.now() + firstStep.delay_hours * 60 * 60 * 1000)
    : new Date(Date.now() + 60 * 60 * 1000) // Default 1 hour

  // Create enrollment
  const { data: enrollment, error: enrollError } = await supabase
    .from('drip_enrollments')
    .upsert({
      sequence_id: sequenceId,
      phone_number: phoneNumber,
      enrolled_at: new Date().toISOString(),
      current_step: 0,
      next_message_at: firstMessageTime.toISOString(),
      status: 'active',
      metadata: {
        trigger_event: triggerEvent,
        enrolled_via: 'marketing-automation'
      }
    }, {
      onConflict: 'sequence_id,phone_number'
    })
    .select()
    .single()

  if (enrollError) {
    throw new Error(`Failed to create enrollment: ${enrollError.message}`)
  }

  console.log(`User ${phoneNumber} enrolled in sequence ${sequence.name}`)

  return {
    success: true,
    message: 'User enrolled successfully',
    enrollment_id: enrollment.id,
    sequence_name: sequence.name,
    first_message_at: firstMessageTime.toISOString(),
    total_steps: sequence.drip_steps.length
  }
}

async function getCampaignStatus(supabase: any) {
  // Get active campaigns
  const { data: campaigns, error: campaignsError } = await supabase
    .from('marketing_campaigns')
    .select(`
      *,
      campaign_messages(
        status,
        scheduled_for,
        sent_at
      )
    `)
    .in('status', ['active', 'paused'])
    .order('created_at', { ascending: false })

  if (campaignsError) {
    throw new Error(`Failed to fetch campaigns: ${campaignsError.message}`)
  }

  // Get active drip sequences
  const { data: sequences, error: sequencesError } = await supabase
    .from('drip_sequences')
    .select(`
      *,
      drip_enrollments(
        status,
        current_step,
        next_message_at
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (sequencesError) {
    throw new Error(`Failed to fetch sequences: ${sequencesError.message}`)
  }

  // Calculate summary statistics
  const campaignStats = (campaigns || []).map(campaign => {
    const messages = campaign.campaign_messages || []
    return {
      ...campaign,
      total_messages: messages.length,
      pending_messages: messages.filter((m: any) => m.status === 'pending').length,
      sent_messages: messages.filter((m: any) => m.status === 'sent').length,
      failed_messages: messages.filter((m: any) => m.status === 'failed').length
    }
  })

  const sequenceStats = (sequences || []).map(sequence => {
    const enrollments = sequence.drip_enrollments || []
    return {
      ...sequence,
      total_enrollments: enrollments.length,
      active_enrollments: enrollments.filter((e: any) => e.status === 'active').length,
      completed_enrollments: enrollments.filter((e: any) => e.status === 'completed').length,
      due_messages: enrollments.filter((e: any) => 
        e.status === 'active' && 
        e.next_message_at && 
        new Date(e.next_message_at) <= new Date()
      ).length
    }
  })

  return {
    campaigns: campaignStats,
    drip_sequences: sequenceStats,
    total_active_campaigns: campaignStats.filter(c => c.status === 'active').length,
    total_active_sequences: sequenceStats.length,
    total_pending_messages: campaignStats.reduce((sum, c) => sum + c.pending_messages, 0),
    total_due_drip_messages: sequenceStats.reduce((sum, s) => sum + s.due_messages, 0)
  }
}
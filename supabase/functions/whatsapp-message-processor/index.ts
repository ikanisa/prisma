/**
 * STEP 5: Enhanced WhatsApp Message Processor
 * Centralized message processing with template support and delivery tracking
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessMessageRequest {
  phone: string;
  message?: string;
  template_name?: string;
  template_variables?: Record<string, string>;
  message_type?: 'text' | 'template' | 'interactive';
  interaction_data?: {
    buttons?: Array<{ id: string; title: string }>;
    list_items?: Array<{ id: string; title: string; description?: string }>;
  };
}

interface MessageTrackingMetrics {
  delivery_rate: number;
  response_rate: number;
  avg_response_time: number;
  error_rate: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { 
      phone, 
      message, 
      template_name, 
      template_variables = {},
      message_type = 'text',
      interaction_data 
    }: ProcessMessageRequest = await req.json();

    console.log(`📱 Processing ${message_type} message for ${phone}`);

    // Validate input
    if (!phone) {
      throw new Error('Phone number is required');
    }

    if (message_type === 'text' && !message) {
      throw new Error('Message content required for text messages');
    }

    if (message_type === 'template' && !template_name) {
      throw new Error('Template name required for template messages');
    }

    let finalMessage = message;
    let messagePayload: any = {
      messaging_product: 'whatsapp',
      to: phone.replace(/[^\d+]/g, ''),
      type: message_type
    };

    // Handle template messages
    if (message_type === 'template' && template_name) {
      const { data: template, error: templateError } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('template_name', template_name)
        .eq('status', 'APPROVED')
        .single();

      if (templateError || !template) {
        console.warn(`Template ${template_name} not found or not approved, falling back to text`);
        messagePayload.type = 'text';
        finalMessage = message || `Template ${template_name} unavailable`;
      } else {
        // Process template with variables
        finalMessage = template.template_content;
        template.variables?.forEach((variable: string, index: number) => {
          const placeholder = `{{${index + 1}}}`;
          const value = template_variables[variable] || `[${variable}]`;
          finalMessage = finalMessage.replace(new RegExp(placeholder, 'g'), value);
        });

        messagePayload.template = {
          name: template_name,
          language: { code: template.language || 'en' }
        };
      }
    }

    // Handle interactive messages
    if (message_type === 'interactive' && interaction_data) {
      if (interaction_data.buttons) {
        messagePayload.interactive = {
          type: 'button',
          body: { text: finalMessage },
          action: {
            buttons: interaction_data.buttons.map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title }
            }))
          }
        };
      } else if (interaction_data.list_items) {
        messagePayload.interactive = {
          type: 'list',
          body: { text: finalMessage },
          action: {
            button: 'Choose Option',
            sections: [{
              title: 'Options',
              rows: interaction_data.list_items
            }]
          }
        };
      }
    }

    // For text messages
    if (messagePayload.type === 'text') {
      messagePayload.text = { body: finalMessage };
    }

    // Send message via WhatsApp API
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappToken || !phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }

    const startTime = Date.now();

    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messagePayload)
    });

    const deliveryTime = Date.now() - startTime;
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(responseData)}`);
    }

    // Log message in conversation history
    const { error: logError } = await supabase
      .from('conversation_messages')
      .insert({
        phone_number: phone,
        channel: 'whatsapp',
        sender: 'agent',
        message_text: finalMessage,
        created_at: new Date().toISOString(),
        metadata: {
          message_id: responseData.messages?.[0]?.id,
          template_name: template_name || null,
          message_type,
          delivery_time_ms: deliveryTime
        }
      });

    if (logError) {
      console.warn('Failed to log conversation:', logError);
    }

    // Track delivery metrics
    await trackDeliveryMetrics(supabase, phone, template_name, deliveryTime, true);

    console.log(`✅ Message sent successfully to ${phone}`);

    return new Response(JSON.stringify({
      success: true,
      message_id: responseData.messages?.[0]?.id,
      delivery_time_ms: deliveryTime,
      template_used: template_name || null,
      final_message: finalMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Message processing error:', error);

    // Track failed delivery
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      await trackDeliveryMetrics(supabase, '', null, 0, false);
    } catch (trackingError) {
      console.warn('Failed to track error metrics:', trackingError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function trackDeliveryMetrics(
  supabase: any, 
  phone: string, 
  templateName: string | null, 
  deliveryTime: number, 
  success: boolean
) {
  try {
    const { error } = await supabase
      .from('whatsapp_delivery_metrics')
      .insert({
        phone_number: phone,
        template_name: templateName,
        delivery_time_ms: deliveryTime,
        delivered: success,
        error_details: success ? null : 'Delivery failed',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Failed to track delivery metrics:', error);
    }
  } catch (error) {
    console.warn('Metrics tracking error:', error);
  }
}
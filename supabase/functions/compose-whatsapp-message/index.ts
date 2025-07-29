import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppButton {
  type: 'reply' | 'quick_reply' | 'url';
  title?: string;
  text?: string;
  payload?: string;
  url?: string;
  reply?: {
    id: string;
    title: string;
  };
}

interface ComposeRequest {
  mode: 'text' | 'interactive' | 'template' | 'image';
  to: string;
  body_text?: string;
  button_options?: WhatsAppButton[];
  template_name?: string;
  template_params?: Record<string, string>;
  image_url?: string;
  header_text?: string;
  footer_text?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: ComposeRequest = await req.json();
    const { mode, to, body_text, button_options, template_name, template_params, image_url, header_text, footer_text } = request;
    
    console.log('Composing WhatsApp message:', { mode, to, template_name });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let payload: any = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ''), // Remove non-digits from phone number
      recipient_type: "individual"
    };

    if (mode === 'text') {
      // Simple text message
      payload.type = "text";
      payload.text = {
        body: body_text || "Hello from easyMO!"
      };
    } 
    else if (mode === 'interactive') {
      // Interactive message with buttons
      payload.type = "interactive";
      payload.interactive = {
        type: "button",
        body: {
          text: body_text || "Choose an option:"
        }
      };

      // Add header if provided
      if (header_text) {
        payload.interactive.header = {
          type: "text",
          text: header_text
        };
      }

      // Add footer if provided
      if (footer_text) {
        payload.interactive.footer = {
          text: footer_text
        };
      }

      // Convert button options to WhatsApp format
      if (button_options && button_options.length > 0) {
        payload.interactive.action = {
          buttons: button_options.slice(0, 3).map((btn, idx) => ({ // Max 3 buttons for WhatsApp
            type: "reply",
            reply: {
              id: btn.payload || btn.reply?.id || `btn_${idx}`,
              title: btn.title || btn.text || btn.reply?.title || `Option ${idx + 1}`
            }
          }))
        };
      }
    }
    else if (mode === 'image') {
      // Image message
      payload.type = "image";
      payload.image = {
        link: image_url
      };
      
      if (body_text) {
        payload.image.caption = body_text;
      }
    }
    else if (mode === 'template') {
      // Template message
      payload.type = "template";
      payload.template = {
        name: template_name || "hello_world",
        language: {
          code: "en"
        }
      };

      // Add template parameters if provided
      if (template_params && Object.keys(template_params).length > 0) {
        payload.template.components = [{
          type: "body",
          parameters: Object.values(template_params).map(value => ({
            type: "text",
            text: value
          }))
        }];
      }
    }

    // Log the outgoing message to the outbound_queue table
    const messageLogData = {
      recipient_phone: to,
      message_type: mode,
      message_payload: payload,
      template_name: template_name || null,
      status: 'composed',
      metadata: {
        composed_at: new Date().toISOString(),
        button_count: button_options?.length || 0,
        has_template_params: !!(template_params && Object.keys(template_params).length > 0)
      }
    };

    const { error: logError } = await supabase
      .from('outbound_queue')
      .insert([messageLogData]);

    if (logError) {
      console.warn('Failed to log message to outbound_queue:', logError.message);
    }

    console.log('WhatsApp message composed successfully:', {
      type: payload.type,
      to: payload.to,
      hasButtons: !!(button_options && button_options.length > 0)
    });

    return new Response(JSON.stringify({
      success: true,
      payload,
      message_type: mode,
      button_count: button_options?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compose-whatsapp-message function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
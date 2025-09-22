import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TPL, sendTemplate, logTemplateSend } from '../_shared/templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, template } = await req.json();
    
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result = { success: true, data: null };

    switch (action) {
      case 'list_templates':
        result.data = {
          templates: TPL,
          count: Object.keys(TPL).length
        };
        break;

      case 'send_template':
        if (!phone || !template) {
          throw new Error('Phone and template are required for sending');
        }
        
        const templateName = TPL[template as keyof typeof TPL];
        if (!templateName) {
          throw new Error(`Template ${template} not found`);
        }

        console.log(`🧪 Testing template send: ${templateName} to ${phone}`);
        
        const sendResult = await sendTemplate(phone, templateName);
        await logTemplateSend(supabase, phone, templateName, sendResult.success);
        
        result.data = {
          template: templateName,
          phone,
          sendResult
        };
        break;

      case 'send_welcome':
        if (!phone) {
          throw new Error('Phone is required');
        }
        
        console.log(`🧪 Testing welcome template to ${phone}`);
        
        const welcomeResult = await sendTemplate(phone, TPL.WELCOME);
        await logTemplateSend(supabase, phone, TPL.WELCOME, welcomeResult.success);
        
        result.data = {
          template: TPL.WELCOME,
          phone,
          sendResult: welcomeResult
        };
        break;

      case 'check_env':
        result.data = {
          hasPhoneId: !!Deno.env.get('META_WABA_PHONE_ID'),
          hasToken: !!Deno.env.get('META_WABA_TOKEN'),
          phoneId: Deno.env.get('META_WABA_PHONE_ID')?.substring(0, 10) + '...',
          templateCount: Object.keys(TPL).length
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Template test error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
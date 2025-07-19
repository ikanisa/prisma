import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Setting up unified marketplace WhatsApp templates...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Cart Templates
    const cartTemplates = [
      {
        template_name: "cart_summary",
        category: "TRANSACTIONAL", 
        language: "en",
        template_content: `🛒 Your Cart Summary

Hi {{1}}! Your cart has {{2}} items totaling {{3}} RWF.

Items:
{{4}}

Ready to checkout? Reply CHECKOUT to proceed.`,
        variables: ["customer_name", "item_count", "total_amount", "item_list"],
        status: "PENDING"
      },
      {
        template_name: "cart_summary_rw", 
        category: "TRANSACTIONAL",
        language: "rw",
        template_content: `🛒 Inyandiko yawe

Muraho {{1}}! Inyandiko yawe ifite {{2}} bintu {{3}} RWF.

Ibintu:
{{4}}

Witeguye kwishyura? Andika CHECKOUT.`,
        variables: ["customer_name", "item_count", "total_amount", "item_list"],
        status: "PENDING"
      }
    ];

    // Payment Templates  
    const paymentTemplates = [
      {
        template_name: "payment_confirmation",
        category: "TRANSACTIONAL",
        language: "en", 
        template_content: `✅ Payment Confirmed

Payment received! {{1}} RWF for order #{{2}}.

USSD: {{3}}
MoMo TX: {{4}}

Your order is being prepared.`,
        variables: ["amount", "order_id", "ussd_code", "momo_tx"],
        status: "PENDING"
      },
      {
        template_name: "payment_confirmation_rw",
        category: "TRANSACTIONAL", 
        language: "rw",
        template_content: `✅ Kwishyura byemejwe

Kwishyura byakiriwe! {{1}} RWF kuri order #{{2}}.

USSD: {{3}}
MoMo TX: {{4}}

Order yawe irateguriwa.`,
        variables: ["amount", "order_id", "ussd_code", "momo_tx"],
        status: "PENDING"
      },
      {
        template_name: "payment_failed",
        category: "TRANSACTIONAL",
        language: "en",
        template_content: `❌ Payment Issue

Payment for order #{{1}} failed.

Amount: {{2}} RWF
Reason: {{3}}

Try again? Reply RETRY`,
        variables: ["order_id", "amount", "failure_reason"],
        status: "PENDING"
      }
    ];

    // Rating Templates
    const ratingTemplates = [
      {
        template_name: "rating_request",
        category: "UTILITY",
        language: "en",
        template_content: `⭐ Rate Your Experience

Hi {{1}}! How was your order #{{2}}?

Rate us 1-5:
1️⃣ Poor
2️⃣ Fair
3️⃣ Good
4️⃣ Very Good
5️⃣ Excellent

Just reply with a number!`,
        variables: ["customer_name", "order_id"],
        status: "PENDING"
      },
      {
        template_name: "rating_request_rw",
        category: "UTILITY", 
        language: "rw",
        template_content: `⭐ Dushimangire

Muraho {{1}}! Order #{{2}} yakunze bite?

Dutange 1-5:
1️⃣ Kibi
2️⃣ Kibiri
3️⃣ Byiza
4️⃣ Byiza cyane
5️⃣ Bitangaje

Subiza ukoresheje numero!`,
        variables: ["customer_name", "order_id"],
        status: "PENDING"
      },
      {
        template_name: "rating_thanks",
        category: "UTILITY",
        language: "en", 
        template_content: `🙏 Thank You!

Thanks {{1}} for rating us {{2}}/5! {{3}}

Your feedback helps us improve.`,
        variables: ["customer_name", "rating", "custom_message"],
        status: "PENDING"
      }
    ];

    const allTemplates = [...cartTemplates, ...paymentTemplates, ...ratingTemplates];
    
    const { data: templates, error: templateError } = await supabase
      .from('whatsapp_templates')
      .upsert(allTemplates, { onConflict: 'template_name' })
      .select();

    if (templateError) {
      throw new Error(`Failed to create templates: ${templateError.message}`);
    }

    console.log(`Created ${templates?.length || 0} WhatsApp templates`);

    const approvalChecklist = {
      templates_submitted: templates?.length || 0,
      required_approvals: [
        'cart_summary (EN/RW) - TRANSACTIONAL', 
        'payment_confirmation (EN/RW) - TRANSACTIONAL',
        'payment_failed (EN) - TRANSACTIONAL', 
        'rating_request (EN/RW) - UTILITY',
        'rating_thanks (EN) - UTILITY'
      ],
      approval_process: [
        '1. Submit templates to Meta via WhatsApp Business Manager',
        '2. Wait for review (24-48 hours for transactional, 2-7 days for utility)',
        '3. Update template status to APPROVED in database',
        '4. Enable automated messaging in production',
        '5. Test with pilot users across all verticals'
      ],
      interactive_lists_required: [
        'Cart items with quantity selectors',
        'Payment method options (MTN/Airtel)',
        'Rating feedback categories'
      ],
      estimated_approval_time: "24-48 hours for transactional, 2-7 days for utility templates"
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        whatsapp_setup: {
          templates_created: templates?.length || 0,
          languages: ['en', 'rw'],
          categories: ['TRANSACTIONAL', 'UTILITY'],
          approval_checklist: approvalChecklist
        },
        next_steps: [
          '✅ Submit all templates to Meta for approval',
          '⏳ Monitor approval status (check WhatsApp Business Manager)',
          '🔄 Update template status in database once approved', 
          '🧪 Test templates in sandbox before production rollout',
          '📊 Track template performance and delivery rates'
        ],
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in setup-whatsapp-templates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
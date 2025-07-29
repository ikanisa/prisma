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

    // Onboarding Templates as specified in the prompt
    const onboardingTemplates = [
      {
        template_name: "ask_momo_v1",
        category: "UTILITY",
        language: "en",
        template_content: `💳 I need your MoMo number to continue.`,
        variables: [],
        status: "PENDING",
        buttons: [
          { type: "quick_reply", text: "Use WhatsApp number", payload: "USE_WA" },
          { type: "quick_reply", text: "Enter another", payload: "ENTER_MOMO" }
        ]
      },
      {
        template_name: "pay_offer_v1", 
        category: "TRANSACTIONAL",
        language: "en",
        template_content: `💰 Payment for {{1}} RWF

Your payment is ready to process.`,
        variables: ["amount"],
        status: "PENDING",
        buttons: [
          { type: "quick_reply", text: "✅ Pay Now", payload: "PAY_CONFIRM" },
          { type: "quick_reply", text: "❌ Cancel", payload: "PAY_CANCEL" }
        ]
      },
      {
        template_name: "marketing_menu_v1",
        category: "UTILITY", 
        language: "en",
        template_content: `🎉 Thanks for using easyMO! Here's what else I can do:
• 🚗 Book a ride
• 🏪 Shop or find businesses  
• 💼 Onboard as driver or merchant`,
        variables: [],
        status: "PENDING",
        buttons: [
          { type: "quick_reply", text: "Ride", payload: "NAV_RIDE" },
          { type: "quick_reply", text: "Find businesses", payload: "NAV_SHOP" },
          { type: "quick_reply", text: "Become a partner", payload: "NAV_PARTNER" }
        ]
      },
      {
        template_name: "partner_type_v1",
        category: "UTILITY",
        language: "en", 
        template_content: `Select what you'd like to onboard as:`,
        variables: [],
        status: "PENDING",
        buttons: [
          { type: "quick_reply", text: "🚕 Moto Driver", payload: "OB_DRIVER" },
          { type: "quick_reply", text: "🏥 Pharmacy", payload: "OB_PHARMACY" },
          { type: "quick_reply", text: "🏪 Shop", payload: "OB_SHOP" }
        ]
      },
      {
        template_name: "driver_form_v1",
        category: "UTILITY",
        language: "en",
        template_content: `🛵 *Driver onboarding*  
1️⃣ Send number plate  
2️⃣ Send log‑book photo  
3️⃣ Confirm MoMo number`,
        variables: [],
        status: "PENDING", 
        buttons: [
          { type: "quick_reply", text: "Confirm", payload: "DRV_CONFIRM" }
        ]
      },
      {
        template_name: "pharmacy_form_v1", 
        category: "UTILITY",
        language: "en",
        template_content: `🏥 *Pharmacy onboarding*  
• Name  
• Address / GPS  
• MoMo code or number`,
        variables: [],
        status: "PENDING",
        buttons: [
          { type: "quick_reply", text: "Submit", payload: "PHA_SUBMIT" }
        ]
      },
      {
        template_name: "summary_confirm_v1",
        category: "UTILITY", 
        language: "en",
        template_content: `Please confirm your details:  
{{1}}`,
        variables: ["details_summary"],
        status: "PENDING",
        buttons: [
          { type: "quick_reply", text: "✅ Correct", payload: "DATA_OK" },
          { type: "quick_reply", text: "✏️ Edit", payload: "DATA_EDIT" }
        ]
      }
    ];

    const allTemplates = [...onboardingTemplates];
    
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
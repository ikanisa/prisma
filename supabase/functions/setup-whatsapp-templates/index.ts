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
    console.log('Setting up WhatsApp templates for hardware vendors...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Hardware vendor WhatsApp templates
    const hardwareTemplates = [
      {
        template_name: 'vendor_welcome_hardware',
        category: 'hardware',
        language: 'en',
        template_content: `Welcome to easyMO Hardware Network! 🛠️

Your hardware store {{shop_name}} is now connected.

Quick commands:
• Type "add 10 hammer 8500" to list products
• Send price sheet photo for bulk import
• Type "help" for full menu

Start selling in minutes! 🚀`,
        variables: ['shop_name'],
        status: 'pending'
      },
      {
        template_name: 'product_import_success',
        category: 'hardware', 
        language: 'en',
        template_content: `✅ Import Complete!

{{product_count}} hardware items added:
{{product_list}}

Your catalog is now live at:
{{shop_url}}

Customers can browse and order immediately! 📦`,
        variables: ['product_count', 'product_list', 'shop_url'],
        status: 'pending'
      },
      {
        template_name: 'new_buyer_match',
        category: 'hardware',
        language: 'en', 
        template_content: `🛒 New Order!

Customer: {{customer_name}}
Items: {{items_list}}
Total: {{total_amount}} RWF

ACCEPT or DECLINE?

⏰ Auto-decline in 10 minutes`,
        variables: ['customer_name', 'items_list', 'total_amount'],
        status: 'pending'
      },
      {
        template_name: 'price_update_broadcast',
        category: 'hardware',
        language: 'en',
        template_content: `💰 Price Update - {{product_name}}

Old Price: {{old_price}} RWF
New Price: {{new_price}} RWF
You Save: {{savings}} RWF

Order now: {{order_link}}
Stock: {{stock_level}} {{unit}} available`,
        variables: ['product_name', 'old_price', 'new_price', 'savings', 'order_link', 'stock_level', 'unit'],
        status: 'pending'
      },
      {
        template_name: 'weekly_sales_report',
        category: 'hardware',
        language: 'en',
        template_content: `📊 Weekly Hardware Sales Report

Period: {{week_dates}}
Total Sales: {{total_sales}} RWF
Orders: {{order_count}}
Top Product: {{top_product}}

Growth: {{growth_percent}}% vs last week
Keep up the great work! 💪`,
        variables: ['week_dates', 'total_sales', 'order_count', 'top_product', 'growth_percent'],
        status: 'pending'
      },
      {
        template_name: 'stock_low_alert',
        category: 'hardware',
        language: 'en',
        template_content: `⚠️ Stock Alert

{{product_name}} running low:
Current Stock: {{current_stock}} {{unit}}
Avg Daily Sales: {{daily_avg}}

Restock suggested: {{restock_amount}} {{unit}}
Reply RESTOCK to update inventory`,
        variables: ['product_name', 'current_stock', 'unit', 'daily_avg', 'restock_amount'],
        status: 'pending'
      },
      {
        template_name: 'customer_quote_hardware',
        category: 'hardware',
        language: 'en',
        template_content: `🧾 Hardware Quote #{{quote_id}}

{{items_breakdown}}

Subtotal: {{subtotal}} RWF
VAT (18%): {{vat_amount}} RWF
Total: {{total}} RWF

Payment: {{momo_code}} or {{payment_link}}
Valid until: {{expiry_time}}`,
        variables: ['quote_id', 'items_breakdown', 'subtotal', 'vat_amount', 'total', 'momo_code', 'payment_link', 'expiry_time'],
        status: 'pending'
      },
      {
        template_name: 'bulk_buyer_invitation',
        category: 'hardware',
        language: 'en', 
        template_content: `🏗️ Bulk Hardware Sale!

Weekly contractor special:
{{bulk_items}}

Bulk Discount: {{discount_percent}}% OFF
Min Order: {{min_quantity}} items
Valid: {{sale_period}}

Join auction: {{auction_link}}`,
        variables: ['bulk_items', 'discount_percent', 'min_quantity', 'sale_period', 'auction_link'],
        status: 'pending'
      }
    ];

    // Kinyarwanda versions for local market
    const kinyarwandaTemplates = [
      {
        template_name: 'vendor_welcome_hardware_rw',
        category: 'hardware',
        language: 'rw',
        template_content: `Murakaza neza kuri easyMO Hardware Network! 🛠️

Iduka ryanyu {{shop_name}} rirakozwe.

Amategeko yoroshye:
• Kwandika "shyira 10 inyundo 8500"
• Kohereza ifoto y'urutonde rw'ibiciro
• Kwandika "ubufasha" kubona menu yose

Tangira gucuruza muri minutsi! 🚀`,
        variables: ['shop_name'],
        status: 'pending'
      },
      {
        template_name: 'new_buyer_match_rw',
        category: 'hardware',
        language: 'rw',
        template_content: `🛒 Uguza gushya!

Umuguzi: {{customer_name}}
Ibintu: {{items_list}}  
Igiciro cyose: {{total_amount}} RWF

EMERA cyangwa ANGA?

⏰ Bizahagarikwa nyuma ya minutsi 10`,
        variables: ['customer_name', 'items_list', 'total_amount'],
        status: 'pending'
      }
    ];

    // Insert all templates
    const allTemplates = [...hardwareTemplates, ...kinyarwandaTemplates];
    
    const { data: templates, error: templateError } = await supabase
      .from('whatsapp_templates')
      .upsert(allTemplates, { onConflict: 'template_name' })
      .select();

    if (templateError) {
      throw new Error(`Failed to create templates: ${templateError.message}`);
    }

    console.log(`Created ${templates?.length || 0} WhatsApp templates`);

    // Approval checklist for WhatsApp Business API
    const approvalChecklist = {
      templates_submitted: templates?.length || 0,
      required_approvals: [
        'vendor_welcome_hardware',
        'new_buyer_match', 
        'customer_quote_hardware',
        'price_update_broadcast'
      ],
      approval_process: [
        '1. Submit templates to WhatsApp Business API',
        '2. Wait for review (24-48 hours)',
        '3. Update template status in database',
        '4. Enable automated messaging',
        '5. Test with pilot vendors'
      ],
      interactive_lists_required: [
        'Product categories (Plumbing, Electrical, Tools, etc.)',
        'Quick actions (Add Product, Update Price, View Orders)',
        'Customer response options (Accept, Decline, Counter-offer)'
      ]
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        whatsapp_setup: {
          templates_created: templates?.length || 0,
          languages: ['en', 'rw'],
          categories: ['hardware'],
          approval_checklist: approvalChecklist
        },
        next_steps: [
          'Submit templates to WhatsApp Business API for approval',
          'Configure interactive lists in WhatsApp Business Manager',
          'Test templates with pilot vendors',
          'Monitor approval status and update database'
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
import { serve } from "https://deno.land/std@0.195.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, patron_whatsapp, bar_id, table_code, items, tip_amount } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;

    switch (action) {
      case 'get_or_create_tab':
        result = await getOrCreateTab(supabase, patron_whatsapp, bar_id, table_code);
        break;
      case 'add_items':
        result = await addItemsToTab(supabase, patron_whatsapp, bar_id, items);
        break;
      case 'get_tab_summary':
        result = await getTabSummary(supabase, patron_whatsapp, bar_id);
        break;
      case 'add_tip':
        result = await addTip(supabase, patron_whatsapp, bar_id, tip_amount);
        break;
      case 'close_tab':
        result = await closeTab(supabase, patron_whatsapp, bar_id);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Tab manager error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getOrCreateTab(supabase: any, whatsapp: string, bar_id: string, table_code: string) {
  // First, get or create bar patron
  let { data: patron } = await supabase
    .from('bar_patrons')
    .select('id')
    .eq('whatsapp', whatsapp)
    .single();

  if (!patron) {
    const { data: newPatron, error: patronError } = await supabase
      .from('bar_patrons')
      .insert({
        whatsapp: whatsapp,
        first_seen: new Date().toISOString()
      })
      .select('id')
      .single();

    if (patronError) throw patronError;
    patron = newPatron;
  }

  // Check for existing open tab
  let { data: tab } = await supabase
    .from('bar_tabs')
    .select('*')
    .eq('patron_id', patron.id)
    .eq('bar_id', bar_id)
    .eq('status', 'open')
    .single();

  if (!tab) {
    // Create new tab
    const { data: newTab, error: tabError } = await supabase
      .from('bar_tabs')
      .insert({
        bar_id: bar_id,
        patron_id: patron.id,
        table_code: table_code,
        status: 'open'
      })
      .select('*')
      .single();

    if (tabError) throw tabError;
    tab = newTab;
  }

  return { tab, patron };
}

async function addItemsToTab(supabase: any, whatsapp: string, bar_id: string, items: any[]) {
  const { tab } = await getOrCreateTab(supabase, whatsapp, bar_id, '');
  
  const tabItems = items.map(item => ({
    tab_id: tab.id,
    product_id: item.product_id,
    qty: item.qty,
    unit_price: item.unit_price,
    status: 'preparing'
  }));

  const { data: insertedItems, error } = await supabase
    .from('tab_items')
    .insert(tabItems)
    .select(`
      *,
      products:product_id (name, category)
    `);

  if (error) throw error;

  // Get updated tab totals
  const { data: updatedTab } = await supabase
    .from('bar_tabs')
    .select('*')
    .eq('id', tab.id)
    .single();

  return { 
    items: insertedItems, 
    tab: updatedTab,
    message: `Added ${items.length} item${items.length > 1 ? 's' : ''} to your tab`
  };
}

async function getTabSummary(supabase: any, whatsapp: string, bar_id: string) {
  const { tab, patron } = await getOrCreateTab(supabase, whatsapp, bar_id, '');
  
  const { data: items } = await supabase
    .from('tab_items')
    .select(`
      *,
      products:product_id (name, category)
    `)
    .eq('tab_id', tab.id)
    .neq('status', 'cancelled');

  const groupedItems = items?.reduce((acc: any[], item: any) => {
    const existing = acc.find(i => i.product_id === item.product_id);
    if (existing) {
      existing.qty += item.qty;
      existing.total += item.qty * item.unit_price;
    } else {
      acc.push({
        product_id: item.product_id,
        name: item.products.name,
        qty: item.qty,
        unit_price: item.unit_price,
        total: item.qty * item.unit_price,
        status: item.status
      });
    }
    return acc;
  }, []);

  return {
    tab,
    items: groupedItems || [],
    summary: {
      subtotal: tab.subtotal,
      tip: tab.tip,
      total: tab.total
    }
  };
}

async function addTip(supabase: any, whatsapp: string, bar_id: string, tip_amount: number) {
  const { tab } = await getOrCreateTab(supabase, whatsapp, bar_id, '');
  
  const { data: updatedTab, error } = await supabase
    .from('bar_tabs')
    .update({ tip: tip_amount })
    .eq('id', tab.id)
    .select('*')
    .single();

  if (error) throw error;

  return { 
    tab: updatedTab,
    message: `Tip of ${tip_amount} RWF added to your tab`
  };
}

async function closeTab(supabase: any, whatsapp: string, bar_id: string) {
  const { tab } = await getOrCreateTab(supabase, whatsapp, bar_id, '');
  
  const { data: updatedTab, error } = await supabase
    .from('bar_tabs')
    .update({ 
      status: 'pending_payment',
      closed_at: new Date().toISOString()
    })
    .eq('id', tab.id)
    .select('*')
    .single();

  if (error) throw error;

  return { 
    tab: updatedTab,
    message: 'Tab closed. Ready for payment.'
  };
}
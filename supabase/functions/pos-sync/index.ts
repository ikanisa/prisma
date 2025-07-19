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
    const { action, bar_id, pos_data } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let result;

    switch (action) {
      case 'sync_stock_quantities':
        result = await syncStockQuantities(supabase, bar_id, pos_data);
        break;
      case 'sync_all_bars':
        result = await syncAllBars(supabase);
        break;
      case 'get_sync_status':
        result = await getSyncStatus(supabase, bar_id);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('POS sync error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncStockQuantities(supabase: any, barId: string, posData: any[]) {
  console.log(`Syncing stock for bar ${barId}, ${posData.length} items`);
  
  const updates = [];
  const errors = [];

  for (const item of posData) {
    try {
      // Find product by SKU or name
      const { data: product } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('business_id', barId)
        .or(`sku.eq.${item.sku},name.ilike.%${item.name}%`)
        .single();

      if (product) {
        // Update stock quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.stock_qty,
            last_pos_sync: new Date().toISOString()
          })
          .eq('id', product.id);

        if (updateError) {
          errors.push({ item: item.name, error: updateError.message });
        } else {
          updates.push({
            product_id: product.id,
            name: product.name,
            old_qty: product.stock_quantity,
            new_qty: item.stock_qty
          });
        }
      } else {
        // Product not found - could auto-create or flag for review
        errors.push({ item: item.name, error: 'Product not found in system' });
      }
    } catch (error) {
      errors.push({ item: item.name || item.sku, error: error.message });
    }
  }

  // Log sync activity
  await supabase
    .from('pos_sync_log')
    .insert({
      bar_id: barId,
      sync_type: 'stock_update',
      items_processed: posData.length,
      items_updated: updates.length,
      items_failed: errors.length,
      sync_details: { updates, errors }
    });

  return {
    success: true,
    updated: updates.length,
    errors: errors.length,
    details: { updates, errors }
  };
}

async function syncAllBars(supabase: any) {
  console.log('Starting sync for all bars');
  
  // Get all active bars
  const { data: bars, error: barsError } = await supabase
    .from('businesses')
    .select('id, name, pos_system_config')
    .eq('category', 'bar')
    .eq('status', 'active');

  if (barsError) throw barsError;

  const results = [];

  for (const bar of bars || []) {
    try {
      // Simulate POS system integration
      // In real implementation, this would call actual POS APIs
      const mockPosData = await getMockPosData(bar.id);
      
      const syncResult = await syncStockQuantities(supabase, bar.id, mockPosData);
      results.push({
        bar_id: bar.id,
        bar_name: bar.name,
        status: 'success',
        ...syncResult
      });
    } catch (error) {
      results.push({
        bar_id: bar.id,
        bar_name: bar.name,
        status: 'error',
        error: error.message
      });
    }
  }

  return {
    bars_processed: results.length,
    successful_syncs: results.filter(r => r.status === 'success').length,
    failed_syncs: results.filter(r => r.status === 'error').length,
    results
  };
}

async function getMockPosData(barId: string) {
  // Mock POS integration - replace with actual POS API calls
  // Different POS systems: Square, Toast, Lightspeed, etc.
  
  return [
    { sku: 'BEER001', name: 'Mutzig Beer', stock_qty: 45 },
    { sku: 'BEER002', name: 'Primus Beer', stock_qty: 32 },
    { sku: 'BEER003', name: 'Skol Beer', stock_qty: 28 },
    { sku: 'SPIRIT001', name: 'Gin Tonic', stock_qty: 15 },
    { sku: 'SPIRIT002', name: 'Whiskey', stock_qty: 8 },
    { sku: 'WINE001', name: 'Red Wine', stock_qty: 12 },
    { sku: 'SOFT001', name: 'Coca Cola', stock_qty: 67 },
    { sku: 'SOFT002', name: 'Fanta', stock_qty: 43 },
    { sku: 'SNACK001', name: 'Peanuts', stock_qty: 25 },
    { sku: 'SNACK002', name: 'Chips', stock_qty: 18 }
  ];
}

async function getSyncStatus(supabase: any, barId: string) {
  const { data: lastSync } = await supabase
    .from('pos_sync_log')
    .select('*')
    .eq('bar_id', barId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: lowStockItems } = await supabase
    .from('products')
    .select('name, stock_quantity, min_stock_level')
    .eq('business_id', barId)
    .lt('stock_quantity', 'min_stock_level');

  return {
    last_sync: lastSync,
    low_stock_count: lowStockItems?.length || 0,
    low_stock_items: lowStockItems || []
  };
}
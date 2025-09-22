import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Seeding sample hardware SKUs...');

    // Initialize Supabase client
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create sample hardware businesses for pilot testing
    const sampleBusinesses = [
      {
        name: 'Kigali Hardware Center',
        category: 'hardware',
        momo_code: 'KHC001',
        status: 'active',
        location_gps: { lat: -1.9441, lng: 30.0619 } // Kigali coordinates
      },
      {
        name: 'Musanze Tools & Materials',
        category: 'hardware', 
        momo_code: 'MTM002',
        status: 'active',
        location_gps: { lat: -1.4989, lng: 29.6342 } // Musanze coordinates
      },
      {
        name: 'Huye Construction Supplies',
        category: 'hardware',
        momo_code: 'HCS003', 
        status: 'active',
        location_gps: { lat: -2.5958, lng: 29.7379 } // Huye coordinates
      }
    ];

    // Insert businesses
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .upsert(sampleBusinesses, { onConflict: 'momo_code' })
      .select();

    if (businessError) {
      throw new Error(`Failed to create businesses: ${businessError.message}`);
    }

    console.log(`Created ${businesses?.length || 0} sample businesses`);

    // Sample hardware products for each business
    const sampleProducts = [
      // Plumbing supplies
      { name: '½ inch PVC Elbow', category: 'plumbing', price: 700, unit: 'pcs', stock: 50, sku: 'PVC-ELB-05' },
      { name: '¾ inch PVC Pipe (3m)', category: 'plumbing', price: 3500, unit: 'pcs', stock: 25, sku: 'PVC-PIP-75' },
      { name: 'PVC Glue (125ml)', category: 'plumbing', price: 2200, unit: 'bottle', stock: 30, sku: 'PVC-GLU-125' },
      { name: 'Tap Connector Set', category: 'plumbing', price: 1800, unit: 'set', stock: 20, sku: 'TAP-CON-ST' },
      
      // Electrical supplies  
      { name: '2.5mm Electrical Wire', category: 'electrical', price: 1200, unit: 'meter', stock: 100, sku: 'ELE-WIR-25' },
      { name: 'Light Switch (2-way)', category: 'electrical', price: 3500, unit: 'pcs', stock: 40, sku: 'LIT-SWI-2W' },
      { name: 'Socket Outlet (UK)', category: 'electrical', price: 2800, unit: 'pcs', stock: 35, sku: 'SOC-OUT-UK' },
      { name: 'Circuit Breaker 20A', category: 'electrical', price: 8500, unit: 'pcs', stock: 15, sku: 'CIR-BRE-20' },
      
      // Tools
      { name: 'Claw Hammer 450g', category: 'tools', price: 8500, unit: 'pcs', stock: 20, sku: 'HAM-CLA-45' },
      { name: 'Screwdriver Set (6pc)', category: 'tools', price: 12000, unit: 'set', stock: 15, sku: 'SCR-SET-6P' },
      { name: 'Measuring Tape 5m', category: 'tools', price: 4500, unit: 'pcs', stock: 25, sku: 'MEA-TAP-5M' },
      { name: 'Drill Bits Set (10pc)', category: 'tools', price: 15000, unit: 'set', stock: 12, sku: 'DRI-BIT-10' },
      
      // Paint supplies
      { name: 'White Emulsion Paint 4L', category: 'paint', price: 18000, unit: 'bucket', stock: 30, sku: 'PAI-WHI-4L' },
      { name: 'Paint Brush 2 inch', category: 'paint', price: 3200, unit: 'pcs', stock: 40, sku: 'PAI-BRU-2I' },
      { name: 'Paint Roller + Tray', category: 'paint', price: 5500, unit: 'set', stock: 20, sku: 'PAI-ROL-TR' },
      { name: 'Masking Tape 24mm', category: 'paint', price: 1500, unit: 'roll', stock: 50, sku: 'MAS-TAP-24' },
      
      // Fasteners  
      { name: 'Common Nails 3 inch', category: 'fasteners', price: 1800, unit: 'kg', stock: 60, sku: 'NAI-COM-3I' },
      { name: 'Wood Screws 40mm', category: 'fasteners', price: 2200, unit: 'kg', stock: 45, sku: 'SCR-WOO-40' },
      { name: 'Bolts & Nuts M10', category: 'fasteners', price: 2800, unit: 'set', stock: 35, sku: 'BOL-NUT-M10' },
      
      // Building materials
      { name: 'Cement 50kg bag', category: 'building', price: 18000, unit: 'bag', stock: 100, sku: 'CEM-50K-BG' },
      { name: 'Iron Sheets 3m', category: 'building', price: 25000, unit: 'sheet', stock: 50, sku: 'IRO-SHE-3M' },
      { name: 'Roofing Nails 3 inch', category: 'building', price: 2500, unit: 'kg', stock: 40, sku: 'ROO-NAI-3I' },
      
      // Safety equipment
      { name: 'Safety Helmet', category: 'safety', price: 5500, unit: 'pcs', stock: 25, sku: 'SAF-HEL-YL' },
      { name: 'Work Gloves Pair', category: 'safety', price: 2800, unit: 'pair', stock: 35, sku: 'WOR-GLO-PR' },
      { name: 'Safety Goggles', category: 'safety', price: 3200, unit: 'pcs', stock: 20, sku: 'SAF-GOG-CL' }
    ];

    // Insert products for each business
    let totalProducts = 0;
    
    for (const business of businesses || []) {
      const businessProducts = sampleProducts.map(product => ({
        ...product,
        vendor_id: business.id,
        status: 'active',
        description: `High quality ${product.name.toLowerCase()} from ${business.name}`
      }));

      const { data: products, error: productError } = await supabase
        .from('products')
        .upsert(businessProducts, { onConflict: 'sku,vendor_id' })
        .select();

      if (productError) {
        console.error(`Failed to create products for ${business.name}:`, productError);
        continue;
      }

      totalProducts += products?.length || 0;
      console.log(`Created ${products?.length || 0} products for ${business.name}`);

      // Sync to Pinecone vector database
      if (products && products.length > 0) {
        try {
          await supabase.functions.invoke('pinecone-hardware-sync', {
            body: { products, action: 'upsert' }
          });
          console.log(`Synced ${products.length} products to Pinecone for ${business.name}`);
        } catch (vectorError) {
          console.error(`Vector sync failed for ${business.name}:`, vectorError);
        }
      }
    }

    console.log(`Sample data seeding completed: ${businesses?.length || 0} businesses, ${totalProducts} products`);

    return new Response(
      JSON.stringify({ 
        success: true,
        businesses_created: businesses?.length || 0,
        products_created: totalProducts,
        pilot_locations: ['Kigali', 'Musanze', 'Huye'],
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in seed-hardware-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
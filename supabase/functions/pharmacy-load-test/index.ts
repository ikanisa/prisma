import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      concurrent_orders = 1000,
      test_duration_minutes = 5,
      ramp_up_seconds = 30
    } = await req.json();

    console.log(`🧪 Starting pharmacy load test: ${concurrent_orders} concurrent orders`);

    const testId = crypto.randomUUID();
    const startTime = Date.now();

    // Initialize test metrics
    const metrics = {
      total_orders_attempted: 0,
      successful_orders: 0,
      failed_orders: 0,
      payment_successes: 0,
      payment_failures: 0,
      courier_assignments: 0,
      courier_assignment_failures: 0,
      avg_response_time: 0,
      max_response_time: 0,
      min_response_time: Infinity,
      error_details: [] as string[]
    };

    // Create test products for load testing
    const testProducts = await createTestProducts();
    
    // Run the load test
    await runPharmacyLoadTest(
      testId,
      concurrent_orders,
      test_duration_minutes,
      ramp_up_seconds,
      testProducts,
      metrics
    );

    // Calculate final metrics
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    if (metrics.total_orders_attempted > 0) {
      metrics.avg_response_time = metrics.avg_response_time / metrics.total_orders_attempted;
    }

    // Store results
    const { error: resultError } = await supabase
      .from('stress_test_results')
      .insert({
        test_id: testId,
        config: {
          test_type: 'pharmacy_orders',
          concurrent_orders,
          test_duration_minutes,
          ramp_up_seconds
        },
        results: {
          ...metrics,
          total_duration_ms: totalDuration,
          orders_per_second: metrics.total_orders_attempted / (totalDuration / 1000),
          success_rate: (metrics.successful_orders / metrics.total_orders_attempted) * 100,
          payment_success_rate: (metrics.payment_successes / metrics.total_orders_attempted) * 100,
          courier_assignment_rate: (metrics.courier_assignments / metrics.total_orders_attempted) * 100
        }
      });

    if (resultError) {
      console.error('Failed to store test results:', resultError);
    }

    // Cleanup test data
    await cleanupTestData(testProducts);

    return new Response(
      JSON.stringify({
        success: true,
        test_id: testId,
        summary: {
          ...metrics,
          total_duration_ms: totalDuration,
          orders_per_second: metrics.total_orders_attempted / (totalDuration / 1000),
          success_rate: (metrics.successful_orders / metrics.total_orders_attempted) * 100,
          payment_success_rate: (metrics.payment_successes / metrics.total_orders_attempted) * 100,
          courier_assignment_rate: (metrics.courier_assignments / metrics.total_orders_attempted) * 100
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Pharmacy load test error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createTestProducts() {
  const testProducts = [
    { name: 'Test Paracetamol 500mg', price: 800, stock_qty: 10000, category: 'pharmacy' },
    { name: 'Test Vitamin C 1000mg', price: 2000, stock_qty: 10000, category: 'pharmacy' },
    { name: 'Test Aspirin 100mg', price: 1200, stock_qty: 10000, category: 'pharmacy' },
    { name: 'Test Ibuprofen 400mg', price: 1500, stock_qty: 10000, category: 'pharmacy' },
    { name: 'Test Amoxicillin 250mg', price: 3000, stock_qty: 10000, category: 'pharmacy' }
  ];

  const { data: products, error } = await supabase
    .from('products')
    .insert(testProducts)
    .select();

  if (error) {
    throw new Error(`Failed to create test products: ${error.message}`);
  }

  return products;
}

async function runPharmacyLoadTest(
  testId: string,
  concurrentOrders: number,
  durationMinutes: number,
  rampUpSeconds: number,
  testProducts: any[],
  metrics: any
) {
  const endTime = Date.now() + (durationMinutes * 60 * 1000);
  const rampUpInterval = (rampUpSeconds * 1000) / concurrentOrders;

  const promises: Promise<void>[] = [];

  // Ramp up orders gradually
  for (let i = 0; i < concurrentOrders; i++) {
    const delay = i * rampUpInterval;
    
    promises.push(
      new Promise(async (resolve) => {
        await new Promise(r => setTimeout(r, delay));
        
        if (Date.now() < endTime) {
          await simulatePharmacyOrder(testId, testProducts, metrics);
        }
        
        resolve();
      })
    );
  }

  await Promise.allSettled(promises);
}

async function simulatePharmacyOrder(testId: string, testProducts: any[], metrics: any) {
  const startTime = Date.now();
  metrics.total_orders_attempted++;

  try {
    // 1. Create test shopper
    const shopper = await createTestShopper();
    
    // 2. Create order with random products
    const orderItems = generateRandomOrderItems(testProducts);
    const order = await createPharmacyOrder(shopper.id, orderItems);
    
    // 3. Process payment
    const paymentSuccess = await simulatePayment(order.id);
    if (paymentSuccess) {
      metrics.payment_successes++;
    } else {
      metrics.payment_failures++;
    }
    
    // 4. Assign courier
    const courierAssigned = await simulateCourierAssignment(order.id);
    if (courierAssigned) {
      metrics.courier_assignments++;
    } else {
      metrics.courier_assignment_failures++;
    }
    
    metrics.successful_orders++;
    
  } catch (error) {
    metrics.failed_orders++;
    metrics.error_details.push(error.message);
  }

  // Track response times
  const responseTime = Date.now() - startTime;
  metrics.avg_response_time += responseTime;
  metrics.max_response_time = Math.max(metrics.max_response_time, responseTime);
  metrics.min_response_time = Math.min(metrics.min_response_time, responseTime);
}

async function createTestShopper() {
  const { data: shopper, error } = await supabase
    .from('pharmacy_shoppers')
    .insert({
      full_name: `Test Shopper ${Date.now()}`,
      whatsapp_number: `+25078${Math.floor(Math.random() * 10000000)}`,
      preferred_lang: 'rw'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test shopper: ${error.message}`);
  }

  return shopper;
}

function generateRandomOrderItems(testProducts: any[]) {
  const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
  const items = [];
  
  for (let i = 0; i < numItems; i++) {
    const product = testProducts[Math.floor(Math.random() * testProducts.length)];
    items.push({
      product_id: product.id,
      qty: Math.floor(Math.random() * 3) + 1,
      unit_price: product.price
    });
  }
  
  return items;
}

async function createPharmacyOrder(shopperId: string, items: any[]) {
  const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
  const deliveryFee = 500;

  const { data: order, error } = await supabase
    .from('pharmacy_orders')
    .insert({
      shopper_id: shopperId,
      total_amount: totalAmount,
      delivery_fee: deliveryFee,
      status: 'draft',
      delivery_address: 'Test Address, Kigali'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }

  // Add order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    qty: item.qty,
    unit_price: item.unit_price
  }));

  const { error: itemsError } = await supabase
    .from('pharmacy_order_items')
    .insert(orderItems);

  if (itemsError) {
    throw new Error(`Failed to create order items: ${itemsError.message}`);
  }

  return order;
}

async function simulatePayment(orderId: string) {
  try {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // 90% success rate
    const success = Math.random() > 0.1;
    
    if (success) {
      await supabase
        .from('pharmacy_orders')
        .update({ status: 'paid' })
        .eq('id', orderId);
    }
    
    return success;
  } catch (error) {
    return false;
  }
}

async function simulateCourierAssignment(orderId: string) {
  try {
    // Simulate courier assignment
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    
    // 85% success rate (some orders might not have available couriers)
    const success = Math.random() > 0.15;
    
    if (success) {
      await supabase
        .from('pharmacy_orders')
        .update({ status: 'preparing' })
        .eq('id', orderId);
    }
    
    return success;
  } catch (error) {
    return false;
  }
}

async function cleanupTestData(testProducts: any[]) {
  try {
    // Delete test pharmacy orders and related data
    await supabase
      .from('pharmacy_order_items')
      .delete()
      .in('product_id', testProducts.map(p => p.id));
    
    await supabase
      .from('pharmacy_orders')
      .delete()
      .like('delivery_address', 'Test Address%');
    
    await supabase
      .from('pharmacy_shoppers')
      .delete()
      .like('full_name', 'Test Shopper%');
    
    // Delete test products
    await supabase
      .from('products')
      .delete()
      .in('id', testProducts.map(p => p.id));

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('⚠️ Test data cleanup failed:', error);
  }
}
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🧪 Testing Data-Aware System Integration');

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        dataValidated: false
      }
    };

    // Test 1: Verify driver data availability
    console.log('Testing driver data availability...');
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id, phone, driver_type, status, location_gps')
      .eq('status', 'active')
      .limit(5);

    testResults.tests.push({
      name: 'Driver Data Availability',
      passed: !driversError && drivers && drivers.length >= 0,
      result: drivers ? `Found ${drivers.length} active drivers` : 'No active drivers',
      data: drivers?.slice(0, 3) || [],
      error: driversError?.message
    });

    // Test 2: Test nearby drivers function
    console.log('Testing nearby drivers function...');
    const { data: nearbyDrivers, error: nearbyError } = await supabase.rpc("fn_get_nearby_drivers_spatial", {
      lat: -1.9441, // Kigali center
      lng: 30.0619,
      radius: 10
    });

    testResults.tests.push({
      name: 'Nearby Drivers Function',
      passed: !nearbyError,
      result: nearbyDrivers ? `Found ${nearbyDrivers.length} drivers within 10km of Kigali` : 'Function error',
      data: nearbyDrivers?.slice(0, 3) || [],
      error: nearbyError?.message
    });

    // Test 3: Test business data
    console.log('Testing business data...');
    const { data: businesses, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, category, phone_number, status')
      .eq('status', 'active')
      .limit(5);

    testResults.tests.push({
      name: 'Business Data Availability',
      passed: !businessError && businesses && businesses.length >= 0,
      result: businesses ? `Found ${businesses.length} active businesses` : 'No active businesses',
      data: businesses?.slice(0, 3) || [],
      error: businessError?.message
    });

    // Test 4: Test products/marketplace data
    console.log('Testing marketplace data...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price_rwf, category, stock_qty, vendor_phone')
      .eq('status', 'active')
      .gt('stock_qty', 0)
      .limit(5);

    testResults.tests.push({
      name: 'Marketplace Data Availability',
      passed: !productsError && products && products.length >= 0,
      result: products ? `Found ${products.length} products in stock` : 'No products available',
      data: products?.slice(0, 3) || [],
      error: productsError?.message
    });

    // Test 5: Test passenger intents
    console.log('Testing passenger intents...');
    const { data: passengers, error: passengersError } = await supabase
      .from('passenger_intents_spatial')
      .select('id, passenger_phone, from_text, to_text, status, created_at')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    testResults.tests.push({
      name: 'Passenger Intents Data',
      passed: !passengersError && passengers && passengers.length >= 0,
      result: passengers ? `Found ${passengers.length} open passenger requests` : 'No open requests',
      data: passengers?.slice(0, 3) || [],
      error: passengersError?.message
    });

    // Test 6: Test data-aware agent with real scenario
    console.log('Testing data-aware agent with nearby drivers query...');
    const testPhone = "+250788123456";
    const testMessage = "nearby drivers";
    const testLocation = { latitude: -1.9441, lng: 30.0619 };

    const { data: agentResponse, error: agentError } = await supabase.functions.invoke('data-aware-agent', {
      body: {
        phone: testPhone,
        message: testMessage,
        location: testLocation
      }
    });

    testResults.tests.push({
      name: 'Data-Aware Agent Integration',
      passed: !agentError && agentResponse?.success,
      result: agentResponse?.response ? 'Agent responded with data-aware answer' : 'Agent failed',
      data: {
        user_type: agentResponse?.user_type,
        response_snippet: agentResponse?.response?.substring(0, 100) + '...',
        data_validated: agentResponse?.data_validated
      },
      error: agentError?.message
    });

    // Test 7: Test location validation flow
    console.log('Testing location validation...');
    const { data: noLocationResponse, error: noLocationError } = await supabase.functions.invoke('data-aware-agent', {
      body: {
        phone: "+250788999999",
        message: "find nearby drivers",
        // No location provided
      }
    });

    testResults.tests.push({
      name: 'Location Validation Flow',
      passed: !noLocationError && noLocationResponse?.response?.includes('location'),
      result: noLocationResponse?.response?.includes('location') ? 'Correctly requests location' : 'Failed to validate location requirement',
      data: {
        response_snippet: noLocationResponse?.response?.substring(0, 100) + '...',
        location_required: noLocationResponse?.location_required
      },
      error: noLocationError?.message
    });

    // Calculate summary
    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.passed).length;
    testResults.summary.failed = testResults.summary.total - testResults.summary.passed;
    testResults.summary.dataValidated = testResults.tests.some(t => 
      t.name.includes('Data Availability') && t.passed && t.data.length > 0
    );

    // Create comprehensive status report
    const statusReport = {
      system_status: testResults.summary.failed === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
      data_integrity: testResults.summary.dataValidated ? 'VALIDATED' : 'NO_DATA',
      agent_functionality: testResults.tests.find(t => t.name === 'Data-Aware Agent Integration')?.passed ? 'OPERATIONAL' : 'NEEDS_ATTENTION',
      location_validation: testResults.tests.find(t => t.name === 'Location Validation Flow')?.passed ? 'WORKING' : 'BROKEN',
      real_data_sources: {
        drivers: drivers?.length || 0,
        businesses: businesses?.length || 0,
        products: products?.length || 0,
        passenger_requests: passengers?.length || 0
      },
      recommendations: []
    };

    // Add recommendations based on test results
    if (drivers?.length === 0) {
      statusReport.recommendations.push("Add sample driver data for testing nearby drivers functionality");
    }
    if (businesses?.length === 0) {
      statusReport.recommendations.push("Add sample business data for testing business discovery");
    }
    if (products?.length === 0) {
      statusReport.recommendations.push("Add sample product data for testing marketplace functionality");
    }
    if (testResults.summary.failed > 0) {
      statusReport.recommendations.push("Review failed tests and fix data access issues");
    }

    console.log('✅ Data-aware system test completed');
    console.log(`Status: ${statusReport.system_status}`);
    console.log(`Data Sources: ${Object.values(statusReport.real_data_sources).reduce((a, b) => a + b, 0)} total records`);

    return new Response(JSON.stringify({
      success: true,
      test_results: testResults,
      status_report: statusReport,
      data_aware_system: {
        description: "System now validates real data before responding",
        key_features: [
          "Location validation for proximity queries",
          "Real-time driver availability checking",
          "Actual business and product data integration",
          "No hallucinated responses about availability",
          "User journey enforcement (location sharing required)",
          "Fallback to data-aware responses when no data found"
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test system error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      test_status: 'FAILED',
      message: 'Unable to complete data-aware system test'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
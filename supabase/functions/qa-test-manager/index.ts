import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'list'

    switch (action) {
      case 'initialize':
        return await initializeTestSuites(supabase)
      case 'seed-data':
        return await seedTestData(supabase)
      case 'list':
        return await listTestSuites(supabase)
      case 'validate':
        return await validateTestSuite(supabase, req)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }

  } catch (error) {
    console.error('QA Test Manager error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function initializeTestSuites(supabase: any) {
  console.log('🚀 Initializing QA test suites...')

  // Create test suites
  const testSuites = [
    {
      name: 'WhatsApp Integration Tests',
      description: 'End-to-end WhatsApp message processing and agent interactions',
      category: 'integration',
      status: 'active'
    },
    {
      name: 'AI Agent Performance Tests',
      description: 'Performance benchmarks for AI agent response times',
      category: 'performance',
      status: 'active'
    },
    {
      name: 'System Load Tests',
      description: 'Concurrent user load testing for all verticals',
      category: 'load',
      status: 'active'
    },
    {
      name: 'E2E User Journey Tests',
      description: 'Complete user workflows from start to finish',
      category: 'e2e',
      status: 'active'
    }
  ]

  const { data: suites, error: suiteError } = await supabase
    .from('qa_test_suites')
    .upsert(testSuites, { onConflict: 'name' })
    .select('*')

  if (suiteError) throw suiteError

  console.log(`✅ Created ${suites.length} test suites`)

  // Create test cases for each suite
  let totalCases = 0

  for (const suite of suites) {
    const testCases = await generateTestCasesForSuite(suite)
    
    const { data: cases, error: caseError } = await supabase
      .from('qa_test_cases')
      .upsert(testCases, { onConflict: 'name,suite_id' })
      .select('*')

    if (caseError) throw caseError
    totalCases += cases.length

    console.log(`✅ Created ${cases.length} test cases for ${suite.name}`)
  }

  // Create performance benchmarks
  await createPerformanceBenchmarks(supabase)

  // Create test fixtures and mocks
  await createTestFixtures(supabase)
  await createTestMocks(supabase)

  return new Response(
    JSON.stringify({
      success: true,
      message: `QA Framework initialized successfully`,
      details: {
        test_suites: suites.length,
        test_cases: totalCases,
        created_at: new Date().toISOString()
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function generateTestCasesForSuite(suite: any): Promise<any[]> {
  switch (suite.category) {
    case 'integration':
      return [
        {
          suite_id: suite.id,
          name: 'WhatsApp Message Processing',
          description: 'Test WhatsApp webhook message processing',
          test_data: {
            function_name: 'whatsapp-webhook',
            parameters: {
              entry: [{
                changes: [{
                  value: {
                    messages: [{
                      from: '+250788123456',
                      text: { body: 'test message' },
                      timestamp: Date.now()
                    }]
                  }
                }]
              }]
            }
          },
          expected_result: { success: true },
          test_steps: ['Send WhatsApp message', 'Process webhook', 'Validate response'],
          priority: 'high',
          tags: ['whatsapp', 'webhook', 'integration'],
          timeout_ms: 30000
        },
        {
          suite_id: suite.id,
          name: 'AI Agent Response',
          description: 'Test AI agent response generation',
          test_data: {
            function_name: 'whatsapp-unified-handler',
            parameters: {
              phone: '+250788123456',
              message: 'Hello, I need help with payments'
            }
          },
          expected_result: { success: true },
          test_steps: ['Send user message', 'Agent processes request', 'Validate response'],
          priority: 'high',
          tags: ['ai', 'agent', 'response'],
          timeout_ms: 45000
        }
      ]

    case 'performance':
      return [
        {
          suite_id: suite.id,
          name: 'AI Response Time',
          description: 'Measure AI agent response time',
          test_data: {
            function_name: 'whatsapp-unified-handler',
            parameters: { phone: '+250788123456', message: 'test' }
          },
          expected_result: { response_time_ms: { max: 3000 } },
          test_steps: ['Send message', 'Measure response time'],
          priority: 'medium',
          tags: ['performance', 'ai', 'response-time'],
          timeout_ms: 60000
        },
        {
          suite_id: suite.id,
          name: 'Database Query Performance',
          description: 'Test database query response times',
          test_data: {
            query_type: 'product_search',
            parameters: { category: 'pharmacy' }
          },
          expected_result: { response_time_ms: { max: 500 } },
          test_steps: ['Execute query', 'Measure time'],
          priority: 'medium',
          tags: ['performance', 'database'],
          timeout_ms: 10000
        }
      ]

    case 'load':
      return [
        {
          suite_id: suite.id,
          name: 'Concurrent Users Load Test',
          description: 'Test system under concurrent user load',
          test_data: {
            function_name: 'whatsapp-unified-handler',
            concurrency: 50,
            iterations: 1000,
            parameters: { phone: '+250788123456', message: 'load test' }
          },
          expected_result: { success_rate: { min: 95 } },
          test_steps: ['Start concurrent requests', 'Monitor success rate', 'Measure performance'],
          priority: 'high',
          tags: ['load', 'concurrency', 'stress'],
          timeout_ms: 300000
        }
      ]

    case 'e2e':
      return [
        {
          suite_id: suite.id,
          name: 'Complete Payment Flow',
          description: 'End-to-end payment workflow test',
          test_data: {
            phone: '+250788123456',
            scenario: 'pharmacy_order',
            steps: ['Browse products', 'Add to cart', 'Checkout', 'Pay', 'Confirm delivery']
          },
          expected_result: { workflow_completed: true },
          test_steps: [
            'User sends "pharmacy" message',
            'Agent shows product catalog',
            'User selects product',
            'Agent processes order',
            'Payment is processed',
            'Order is confirmed'
          ],
          priority: 'critical',
          tags: ['e2e', 'payment', 'pharmacy'],
          timeout_ms: 180000
        }
      ]

    default:
      return []
  }
}

async function createPerformanceBenchmarks(supabase: any) {
  const benchmarks = [
    {
      test_name: 'AI Response Time',
      metric_name: 'response_time_ms',
      expected_value: 3000,
      tolerance_percent: 20,
      unit: 'milliseconds',
      category: 'response_time'
    },
    {
      test_name: 'Database Query Performance',
      metric_name: 'query_time_ms',
      expected_value: 500,
      tolerance_percent: 15,
      unit: 'milliseconds',
      category: 'database'
    },
    {
      test_name: 'Concurrent Users Load Test',
      metric_name: 'success_rate',
      expected_value: 95,
      tolerance_percent: 5,
      unit: 'percentage',
      category: 'reliability'
    }
  ]

  const { error } = await supabase
    .from('qa_performance_benchmarks')
    .upsert(benchmarks, { onConflict: 'test_name,metric_name' })

  if (error) throw error
  console.log(`✅ Created ${benchmarks.length} performance benchmarks`)
}

async function createTestFixtures(supabase: any) {
  const fixtures = [
    {
      name: 'test_user_data',
      description: 'Standard test user data for all tests',
      fixture_data: {
        phone: '+250788123456',
        name: 'Test User',
        location: 'Kigali',
        language: 'en'
      },
      category: 'user'
    },
    {
      name: 'pharmacy_products',
      description: 'Sample pharmacy products for testing',
      fixture_data: {
        products: [
          { id: 'paracetamol', name: 'Paracetamol 500mg', price: 500, stock: 100 },
          { id: 'vitamins', name: 'Daily Vitamins', price: 2000, stock: 50 }
        ]
      },
      category: 'products'
    },
    {
      name: 'test_drivers',
      description: 'Test driver data for ride tests',
      fixture_data: {
        drivers: [
          { id: 'driver1', name: 'Test Driver', phone: '+250788987654', location: 'Kigali' }
        ]
      },
      category: 'drivers'
    }
  ]

  const { error } = await supabase
    .from('qa_test_fixtures')
    .upsert(fixtures, { onConflict: 'name' })

  if (error) throw error
  console.log(`✅ Created ${fixtures.length} test fixtures`)
}

async function createTestMocks(supabase: any) {
  const mocks = [
    {
      name: 'mock_payment_api',
      description: 'Mock payment API responses',
      mock_config: {
        type: 'api_mock',
        responses: {
          success: { status: 'success', transaction_id: 'test123' },
          failure: { status: 'failed', error: 'insufficient_funds' }
        }
      },
      endpoint_pattern: '/api/payments/*',
      response_data: { status: 'success', transaction_id: 'mock123' },
      response_delay_ms: 1000
    },
    {
      name: 'mock_whatsapp_api',
      description: 'Mock WhatsApp API for testing',
      mock_config: {
        type: 'webhook_mock',
        responses: {
          message_sent: { id: 'msg123', status: 'sent' }
        }
      },
      endpoint_pattern: '/whatsapp/send',
      response_data: { id: 'mock_msg', status: 'sent' },
      response_delay_ms: 500
    }
  ]

  const { error } = await supabase
    .from('qa_test_mocks')
    .upsert(mocks, { onConflict: 'name' })

  if (error) throw error
  console.log(`✅ Created ${mocks.length} test mocks`)
}

async function seedTestData(supabase: any) {
  // Add sample test runs and results for demo purposes
  const { data: suites } = await supabase
    .from('qa_test_suites')
    .select('id, name')
    .limit(3)

  if (!suites) return

  for (const suite of suites) {
    const { data: testCases } = await supabase
      .from('qa_test_cases')
      .select('id')
      .eq('suite_id', suite.id)
      .limit(2)

    if (testCases) {
      // Create some sample test runs
      for (const testCase of testCases) {
        await supabase
          .from('qa_test_runs')
          .insert({
            suite_id: suite.id,
            test_case_id: testCase.id,
            status: Math.random() > 0.2 ? 'passed' : 'failed',
            execution_time_ms: Math.floor(Math.random() * 5000) + 1000,
            environment: 'development',
            started_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            completed_at: new Date().toISOString()
          })
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Test data seeded successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function listTestSuites(supabase: any) {
  const { data: suites, error } = await supabase
    .from('qa_test_suites')
    .select(`
      *,
      qa_test_cases(count)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, data: suites }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function validateTestSuite(supabase: any, req: Request) {
  const { suite_id } = await req.json()

  const { data: suite, error } = await supabase
    .from('qa_test_suites')
    .select(`
      *,
      qa_test_cases(*)
    `)
    .eq('id', suite_id)
    .single()

  if (error) throw error

  // Validate test cases
  const validationResults = {
    valid: true,
    issues: [] as string[]
  }

  for (const testCase of suite.qa_test_cases) {
    if (!testCase.test_data || Object.keys(testCase.test_data).length === 0) {
      validationResults.issues.push(`Test case "${testCase.name}" has no test data`)
      validationResults.valid = false
    }

    if (!testCase.expected_result) {
      validationResults.issues.push(`Test case "${testCase.name}" has no expected result`)
      validationResults.valid = false
    }

    if (testCase.timeout_ms < 1000) {
      validationResults.issues.push(`Test case "${testCase.name}" timeout too low`)
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      validation: validationResults,
      suite_name: suite.name
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
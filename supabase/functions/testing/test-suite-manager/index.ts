import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InitTestsRequest {
  initialize_default_tests?: boolean
  include_whatsapp_tests?: boolean
  include_agent_tests?: boolean
  include_performance_tests?: boolean
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      const body = await req.json() as InitTestsRequest
      const result = await initializeTestSuites(supabase, body)
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      const url = new URL(req.url)
      const category = url.searchParams.get('category')
      
      let query = supabase
        .from('test_suites')
        .select(`
          *,
          test_cases(
            id,
            name,
            description,
            test_function,
            status,
            timeout_ms
          )
        `)
        .order('created_at', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch test suites: ${error.message}`)
      }

      return new Response(
        JSON.stringify({ suites: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Test suite manager error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function initializeTestSuites(supabase: any, options: InitTestsRequest) {
  const results = {
    suites_created: 0,
    test_cases_created: 0,
    fixtures_created: 0,
    mocks_created: 0
  }

  if (options.initialize_default_tests || options.include_whatsapp_tests) {
    await createWhatsAppTestSuite(supabase)
    results.suites_created++
  }

  if (options.initialize_default_tests || options.include_agent_tests) {
    await createAgentTestSuite(supabase)
    results.suites_created++
  }

  if (options.initialize_default_tests || options.include_performance_tests) {
    await createPerformanceTestSuite(supabase)
    results.suites_created++
  }

  // Create default test fixtures
  await createDefaultFixtures(supabase)
  results.fixtures_created += 3

  // Create default mocks
  await createDefaultMocks(supabase)
  results.mocks_created += 4

  return results
}

async function createWhatsAppTestSuite(supabase: any) {
  // Create WhatsApp test suite
  const { data: suite, error: suiteError } = await supabase
    .from('test_suites')
    .upsert({
      name: 'WhatsApp Integration Tests',
      description: 'Comprehensive tests for WhatsApp message processing and analytics',
      category: 'integration'
    })
    .select()
    .single()

  if (suiteError) {
    console.log('Suite might already exist, continuing...')
    const { data: existingSuite } = await supabase
      .from('test_suites')
      .select()
      .eq('name', 'WhatsApp Integration Tests')
      .single()
    
    if (!existingSuite) {
      throw new Error(`Failed to create WhatsApp test suite: ${suiteError.message}`)
    }
    suite = existingSuite
  }

  // Create test cases for WhatsApp
  const testCases = [
    {
      suite_id: suite.id,
      name: 'Send Text Message',
      description: 'Test sending a simple text message via WhatsApp',
      test_function: 'compose-whatsapp-message',
      test_data: {
        phone_number: 'test_123456789',
        message: 'Hello from test',
        message_type: 'text'
      },
      expected_result: {
        success: true,
        message_sent: true
      },
      timeout_ms: 10000
    },
    {
      suite_id: suite.id,
      name: 'Send Template Message',
      description: 'Test sending a template message with variables',
      test_function: 'compose-whatsapp-message',
      test_data: {
        phone_number: 'test_987654321',
        template_name: 'welcome_message',
        template_variables: {
          name: 'Test User',
          code: '12345'
        },
        message_type: 'template'
      },
      expected_result: {
        success: true,
        message_sent: true,
        template_processed: true
      },
      timeout_ms: 15000
    },
    {
      suite_id: suite.id,
      name: 'Analytics Data Collection',
      description: 'Test that message sending updates analytics correctly',
      test_function: 'whatsapp-analytics',
      test_data: {
        period: '24h',
        metric_type: 'delivery'
      },
      expected_result: {
        success: true,
        metrics_available: true
      },
      timeout_ms: 5000
    },
    {
      suite_id: suite.id,
      name: 'Message Delivery Tracking',
      description: 'Test delivery metrics are recorded correctly',
      test_function: 'compose-whatsapp-message',
      test_data: {
        phone_number: 'test_555666777',
        message: 'Delivery test message',
        track_delivery: true
      },
      expected_result: {
        success: true,
        delivery_tracked: true
      },
      timeout_ms: 8000
    }
  ]

  for (const testCase of testCases) {
    await supabase
      .from('test_cases')
      .upsert(testCase, { 
        onConflict: 'suite_id,name',
        ignoreDuplicates: false 
      })
  }
}

async function createAgentTestSuite(supabase: any) {
  // Create Agent test suite
  const { data: suite, error: suiteError } = await supabase
    .from('test_suites')
    .upsert({
      name: 'AI Agent Tests',
      description: 'Tests for AI agent responses and conversation flows',
      category: 'integration'
    })
    .select()
    .single()

  if (suiteError) {
    console.log('Suite might already exist, continuing...')
    const { data: existingSuite } = await supabase
      .from('test_suites')
      .select()
      .eq('name', 'AI Agent Tests')
      .single()
    
    suite = existingSuite
  }

  // Create test cases for Agents
  const testCases = [
    {
      suite_id: suite.id,
      name: 'Onboarding Agent Response',
      description: 'Test onboarding agent handles new user correctly',
      test_function: 'whatsapp-webhook',
      test_data: {
        phone_number: 'test_onboarding_123',
        message: 'Hi, I\'m new here',
        agent_type: 'onboarding'
      },
      expected_result: {
        success: true,
        agent_responded: true,
        response_relevant: true
      },
      timeout_ms: 20000
    },
    {
      suite_id: suite.id,
      name: 'Payment Agent Flow',
      description: 'Test payment agent handles payment request',
      test_function: 'whatsapp-webhook',
      test_data: {
        phone_number: 'test_payment_456',
        message: 'I want to make a payment',
        agent_type: 'payment'
      },
      expected_result: {
        success: true,
        payment_flow_started: true
      },
      timeout_ms: 25000
    },
    {
      suite_id: suite.id,
      name: 'Marketplace Agent Search',
      description: 'Test marketplace agent handles product search',
      test_function: 'whatsapp-webhook',
      test_data: {
        phone_number: 'test_marketplace_789',
        message: 'I need tomatoes',
        agent_type: 'marketplace'
      },
      expected_result: {
        success: true,
        products_found: true
      },
      timeout_ms: 15000
    }
  ]

  for (const testCase of testCases) {
    await supabase
      .from('test_cases')
      .upsert(testCase, { 
        onConflict: 'suite_id,name',
        ignoreDuplicates: false 
      })
  }
}

async function createPerformanceTestSuite(supabase: any) {
  // Create Performance test suite
  const { data: suite, error: suiteError } = await supabase
    .from('test_suites')
    .upsert({
      name: 'Performance Tests',
      description: 'Load and performance tests for edge functions',
      category: 'e2e'
    })
    .select()
    .single()

  if (suiteError) {
    console.log('Suite might already exist, continuing...')
    const { data: existingSuite } = await supabase
      .from('test_suites')
      .select()
      .eq('name', 'Performance Tests')
      .single()
    
    suite = existingSuite
  }

  // Create performance test cases
  const testCases = [
    {
      suite_id: suite.id,
      name: 'Cold Start Performance',
      description: 'Measure cold start times for edge functions',
      test_function: 'performance-monitor',
      test_data: {
        test_type: 'cold_start',
        target_functions: [
          'compose-whatsapp-message',
          'whatsapp-analytics',
          'whatsapp-webhook'
        ]
      },
      expected_result: {
        success: true,
        cold_start_under_3s: true
      },
      timeout_ms: 30000
    },
    {
      suite_id: suite.id,
      name: 'Load Test WhatsApp Processor',
      description: 'Test WhatsApp processor under load',
      test_function: 'performance-monitor',
      test_data: {
        test_type: 'load_test',
        target_function: 'compose-whatsapp-message',
        concurrent_requests: 10,
        duration_seconds: 60
      },
      expected_result: {
        success: true,
        success_rate_above_95: true,
        avg_response_under_2s: true
      },
      timeout_ms: 90000
    }
  ]

  for (const testCase of testCases) {
    await supabase
      .from('test_cases')
      .upsert(testCase, { 
        onConflict: 'suite_id,name',
        ignoreDuplicates: false 
      })
  }
}

async function createDefaultFixtures(supabase: any) {
  const fixtures = [
    {
      name: 'whatsapp_test_data',
      description: 'Test data for WhatsApp integration tests',
      setup_sql: `
        INSERT INTO contacts (phone_number, name, contact_type) 
        VALUES 
          ('test_123456789', 'Test User 1', 'prospect'),
          ('test_987654321', 'Test User 2', 'customer'),
          ('test_555666777', 'Test User 3', 'prospect')
        ON CONFLICT (phone_number) DO NOTHING;
      `,
      teardown_sql: `
        DELETE FROM contacts WHERE phone_number LIKE 'test_%';
        DELETE FROM conversation_messages WHERE phone_number LIKE 'test_%';
        DELETE FROM conversation_analytics WHERE phone_number LIKE 'test_%';
      `,
      test_data: {
        test_phones: ['test_123456789', 'test_987654321', 'test_555666777']
      }
    },
    {
      name: 'agent_test_scenarios',
      description: 'Test scenarios for AI agent interactions',
      setup_sql: `
        INSERT INTO conversation_flows (phone_number, flow_name, current_step, status)
        VALUES 
          ('test_onboarding_123', 'onboarding', 'welcome', 'active'),
          ('test_payment_456', 'payment', 'amount_input', 'active')
        ON CONFLICT DO NOTHING;
      `,
      teardown_sql: `
        DELETE FROM conversation_flows WHERE phone_number LIKE 'test_%';
      `,
      test_data: {
        agent_scenarios: ['onboarding', 'payment', 'marketplace', 'support']
      }
    },
    {
      name: 'performance_baseline',
      description: 'Baseline data for performance comparisons',
      setup_sql: `
        -- No setup needed for performance tests
      `,
      teardown_sql: `
        -- Clean up old performance data
        DELETE FROM performance_benchmarks WHERE environment = 'test';
      `,
      test_data: {
        expected_response_times: {
          whatsapp_processor: 2000,
          analytics: 1000,
          webhook: 3000
        }
      }
    }
  ]

  for (const fixture of fixtures) {
    await supabase
      .from('test_fixtures')
      .upsert(fixture, { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
  }
}

async function createDefaultMocks(supabase: any) {
  const mocks = [
    {
      service_name: 'whatsapp',
      endpoint_pattern: '/messages',
      method: 'POST',
      mock_response: {
        success: true,
        message_id: 'mock_msg_123',
        status: 'sent'
      },
      response_delay_ms: 500,
      status_code: 200
    },
    {
      service_name: 'openai',
      endpoint_pattern: '/chat/completions',
      method: 'POST',
      mock_response: {
        choices: [{
          message: {
            content: 'This is a mock AI response for testing purposes.'
          }
        }]
      },
      response_delay_ms: 1000,
      status_code: 200
    },
    {
      service_name: 'whatsapp',
      endpoint_pattern: '/webhook',
      method: 'POST',
      mock_response: {
        success: true,
        processed: true
      },
      response_delay_ms: 200,
      status_code: 200
    },
    {
      service_name: 'payment',
      endpoint_pattern: '/momo/request',
      method: 'POST',
      mock_response: {
        success: true,
        transaction_id: 'mock_txn_456',
        status: 'pending'
      },
      response_delay_ms: 800,
      status_code: 200
    }
  ]

  for (const mock of mocks) {
    await supabase
      .from('test_mocks')
      .upsert(mock, { 
        onConflict: 'service_name,endpoint_pattern,method',
        ignoreDuplicates: false 
      })
  }
}
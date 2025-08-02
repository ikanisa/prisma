import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestRunRequest {
  suite_id?: string;
  test_case_ids?: string[];
  environment?: string;
  parallel?: boolean;
}

interface TestResult {
  test_case_id: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  execution_time_ms: number;
  actual_result?: any;
  error_details?: string;
  logs?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { suite_id, test_case_ids, environment = 'development', parallel = true } = await req.json() as TestRunRequest

    console.log(`🚀 Starting QA execution - Suite: ${suite_id}, Environment: ${environment}`)

    // Fetch test cases to execute
    let query = supabase
      .from('qa_test_cases')
      .select(`
        *,
        qa_test_suites!inner(name, category)
      `)
      .eq('is_active', true)

    if (suite_id) {
      query = query.eq('suite_id', suite_id)
    }
    if (test_case_ids && test_case_ids.length > 0) {
      query = query.in('id', test_case_ids)
    }

    const { data: testCases, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch test cases: ${fetchError.message}`)
    }

    if (!testCases || testCases.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No test cases found to execute',
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📋 Found ${testCases.length} test cases to execute`)

    // Execute tests
    const results: TestResult[] = []
    const startTime = Date.now()

    if (parallel) {
      // Execute tests in parallel
      const testPromises = testCases.map(testCase => executeTestCase(supabase, testCase, environment))
      const parallelResults = await Promise.allSettled(testPromises)
      
      parallelResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            test_case_id: testCases[index].id,
            status: 'error',
            execution_time_ms: 0,
            error_details: `Test execution failed: ${result.reason}`
          })
        }
      })
    } else {
      // Execute tests sequentially
      for (const testCase of testCases) {
        try {
          const result = await executeTestCase(supabase, testCase, environment)
          results.push(result)
        } catch (error) {
          results.push({
            test_case_id: testCase.id,
            status: 'error',
            execution_time_ms: 0,
            error_details: `Test execution failed: ${error.message}`
          })
        }
      }
    }

    const totalExecutionTime = Date.now() - startTime

    // Update suite statistics
    if (suite_id) {
      const passed = results.filter(r => r.status === 'passed').length
      const failed = results.filter(r => r.status === 'failed').length
      const avgDuration = Math.round(results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length)

      await supabase
        .from('qa_test_suites')
        .update({
          total_tests: results.length,
          passed_tests: passed,
          failed_tests: failed,
          last_run_at: new Date().toISOString(),
          average_duration_ms: avgDuration
        })
        .eq('id', suite_id)
    }

    // Generate summary report
    const summary = {
      total_tests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error').length,
      timeouts: results.filter(r => r.status === 'timeout').length,
      total_execution_time_ms: totalExecutionTime,
      success_rate: results.length > 0 ? Math.round((results.filter(r => r.status === 'passed').length / results.length) * 100) : 0
    }

    console.log(`✅ QA execution completed - ${summary.passed}/${summary.total_tests} passed (${summary.success_rate}%)`)

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        environment,
        executed_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('QA execution error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        executed_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function executeTestCase(supabase: any, testCase: any, environment: string): Promise<TestResult> {
  const startTime = Date.now()
  
  try {
    console.log(`🧪 Executing test: ${testCase.name}`)

    // Create test run record
    const { data: testRun } = await supabase
      .from('qa_test_runs')
      .insert({
        suite_id: testCase.suite_id,
        test_case_id: testCase.id,
        status: 'running',
        environment,
        started_at: new Date().toISOString()
      })
      .select('id')
      .single()

    let result: TestResult

    // Execute test based on suite category
    const category = testCase.qa_test_suites?.category || 'integration'
    
    switch (category) {
      case 'integration':
        result = await executeIntegrationTest(supabase, testCase)
        break
      case 'performance':
        result = await executePerformanceTest(supabase, testCase)
        break
      case 'load':
        result = await executeLoadTest(supabase, testCase)
        break
      case 'e2e':
        result = await executeE2ETest(supabase, testCase)
        break
      default:
        result = await executeIntegrationTest(supabase, testCase)
    }

    result.execution_time_ms = Date.now() - startTime

    // Update test run record
    await supabase
      .from('qa_test_runs')
      .update({
        status: result.status,
        execution_time_ms: result.execution_time_ms,
        actual_result: result.actual_result,
        error_details: result.error_details,
        logs: result.logs,
        completed_at: new Date().toISOString()
      })
      .eq('id', testRun.id)

    return result

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error(`❌ Test ${testCase.name} failed:`, error)

    return {
      test_case_id: testCase.id,
      status: 'error',
      execution_time_ms: executionTime,
      error_details: error.message
    }
  }
}

async function executeIntegrationTest(supabase: any, testCase: any): Promise<TestResult> {
  const { test_data, expected_result } = testCase

  // Simulate API call based on test data
  if (test_data.function_name) {
    try {
      const { data, error } = await supabase.functions.invoke(test_data.function_name, {
        body: test_data.parameters || {}
      })

      if (error) throw error

      // Compare result with expected
      const passed = compareResults(data, expected_result)

      return {
        test_case_id: testCase.id,
        status: passed ? 'passed' : 'failed',
        execution_time_ms: 0, // Will be set by caller
        actual_result: data,
        logs: `Integration test for ${test_data.function_name}`
      }
    } catch (error) {
      return {
        test_case_id: testCase.id,
        status: 'failed',
        execution_time_ms: 0,
        error_details: error.message
      }
    }
  }

  // Default mock test
  return {
    test_case_id: testCase.id,
    status: 'passed',
    execution_time_ms: 0,
    actual_result: { message: 'Mock integration test passed' }
  }
}

async function executePerformanceTest(supabase: any, testCase: any): Promise<TestResult> {
  const { test_data, expected_result } = testCase
  
  // Get performance benchmark
  const { data: benchmark } = await supabase
    .from('qa_performance_benchmarks')
    .select('*')
    .eq('test_name', testCase.name)
    .single()

  const startTime = performance.now()
  
  // Execute the performance test
  if (test_data.function_name) {
    await supabase.functions.invoke(test_data.function_name, {
      body: test_data.parameters || {}
    })
  }

  const executionTime = performance.now() - startTime

  // Check against benchmark
  if (benchmark) {
    const tolerance = benchmark.tolerance_percent / 100
    const maxAllowed = benchmark.expected_value * (1 + tolerance)
    
    const passed = executionTime <= maxAllowed

    return {
      test_case_id: testCase.id,
      status: passed ? 'passed' : 'failed',
      execution_time_ms: 0,
      actual_result: { execution_time_ms: executionTime, benchmark_ms: benchmark.expected_value },
      logs: `Performance test: ${executionTime}ms (benchmark: ${benchmark.expected_value}ms)`
    }
  }

  return {
    test_case_id: testCase.id,
    status: 'passed',
    execution_time_ms: 0,
    actual_result: { execution_time_ms: executionTime }
  }
}

async function executeLoadTest(supabase: any, testCase: any): Promise<TestResult> {
  const { test_data } = testCase
  const concurrency = test_data.concurrency || 10
  const iterations = test_data.iterations || 100

  const promises = []
  const startTime = performance.now()

  // Simulate concurrent load
  for (let i = 0; i < concurrency; i++) {
    const batchPromises = []
    for (let j = 0; j < iterations / concurrency; j++) {
      if (test_data.function_name) {
        batchPromises.push(
          supabase.functions.invoke(test_data.function_name, {
            body: test_data.parameters || {}
          })
        )
      }
    }
    promises.push(Promise.all(batchPromises))
  }

  try {
    await Promise.all(promises)
    const totalTime = performance.now() - startTime

    return {
      test_case_id: testCase.id,
      status: 'passed',
      execution_time_ms: 0,
      actual_result: { 
        total_time_ms: totalTime, 
        requests_per_second: Math.round((iterations / totalTime) * 1000),
        concurrency,
        iterations
      },
      logs: `Load test completed: ${iterations} requests with ${concurrency} concurrent users`
    }
  } catch (error) {
    return {
      test_case_id: testCase.id,
      status: 'failed',
      execution_time_ms: 0,
      error_details: error.message
    }
  }
}

async function executeE2ETest(supabase: any, testCase: any): Promise<TestResult> {
  const { test_steps, test_data } = testCase

  try {
    const stepResults = []

    // Execute each test step
    for (const step of test_steps || []) {
      if (step.includes('WhatsApp')) {
        // Simulate WhatsApp webhook
        const webhookData = {
          entry: [{
            changes: [{
              value: {
                messages: [{
                  from: test_data.phone || '+250788123456',
                  text: { body: test_data.message || 'test' },
                  timestamp: Date.now()
                }]
              }
            }]
          }]
        }

        const { data, error } = await supabase.functions.invoke('whatsapp-webhook', {
          body: webhookData
        })

        if (error) throw error
        stepResults.push({ step, result: data })
      }
    }

    return {
      test_case_id: testCase.id,
      status: 'passed',
      execution_time_ms: 0,
      actual_result: { steps_completed: stepResults.length, step_results: stepResults },
      logs: `E2E test completed ${stepResults.length} steps`
    }
  } catch (error) {
    return {
      test_case_id: testCase.id,
      status: 'failed',
      execution_time_ms: 0,
      error_details: error.message
    }
  }
}

function compareResults(actual: any, expected: any): boolean {
  if (typeof expected !== 'object' || expected === null) {
    return actual === expected
  }

  for (const key in expected) {
    if (expected.hasOwnProperty(key)) {
      if (actual[key] !== expected[key]) {
        return false
      }
    }
  }

  return true
}
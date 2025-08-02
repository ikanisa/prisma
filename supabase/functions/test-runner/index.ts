import { withErrorHandling } from "./_shared/errorHandler.ts";
import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestRunRequest {
  suite_id?: string
  test_case_id?: string
  execution_id?: string
  environment?: string
}

interface TestResult {
  test_case_id: string
  status: 'passed' | 'failed' | 'timeout' | 'error'
  execution_time_ms: number
  actual_result?: any
  error_details?: string
  logs?: string
}

serve(withErrorHandling(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json() as TestRunRequest
    const { suite_id, test_case_id, execution_id, environment = 'test' } = body

    console.log('Test runner started:', { suite_id, test_case_id, execution_id })

    // Generate execution ID if not provided
    const runExecutionId = execution_id || crypto.randomUUID()

    // Get test cases to run
    let query = supabase
      .from('test_cases')
      .select(`
        *,
        test_suites(name, category)
      `)
      .eq('status', 'active')

    if (suite_id) {
      query = query.eq('suite_id', suite_id)
    }
    if (test_case_id) {
      query = query.eq('id', test_case_id)
    }

    const { data: testCases, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch test cases: ${fetchError.message}`)
    }

    if (!testCases || testCases.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No test cases found',
          execution_id: runExecutionId,
          results: []
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Running ${testCases.length} test cases`)

    // Clean test data before running
    await supabase.rpc('clean_test_data')

    const results: TestResult[] = []

    // Run each test case
    for (const testCase of testCases) {
      const startTime = Date.now()
      
      // Create test run record
      const { data: testRun, error: insertError } = await supabase
        .from('test_runs')
        .insert({
          suite_id: testCase.suite_id,
          test_case_id: testCase.id,
          execution_id: runExecutionId,
          status: 'running'
        })
        .select()
        .single()

      if (insertError) {
        console.error('Failed to create test run record:', insertError)
        continue
      }

      let result: TestResult = {
        test_case_id: testCase.id,
        status: 'error',
        execution_time_ms: 0,
        error_details: 'Unknown error'
      }

      try {
        console.log(`Running test: ${testCase.name}`)

        // Setup test mocks if any
        await setupTestMocks(supabase, testCase.test_function)

        // Execute test function
        const testResult = await executeTestFunction(
          supabase,
          testCase.test_function,
          testCase.test_data,
          testCase.timeout_ms
        )

        const executionTime = Date.now() - startTime

        // Compare with expected result
        const passed = await compareResults(testResult, testCase.expected_result)

        result = {
          test_case_id: testCase.id,
          status: passed ? 'passed' : 'failed',
          execution_time_ms: executionTime,
          actual_result: testResult,
          logs: testResult?.logs || ''
        }

        if (!passed) {
          result.error_details = `Expected: ${JSON.stringify(testCase.expected_result)}, Got: ${JSON.stringify(testResult)}`
        }

      } catch (error) {
        const executionTime = Date.now() - startTime
        
        result = {
          test_case_id: testCase.id,
          status: executionTime > testCase.timeout_ms ? 'timeout' : 'error',
          execution_time_ms: executionTime,
          error_details: error.message,
          logs: error.stack || ''
        }
      }

      // Update test run record
      await supabase
        .from('test_runs')
        .update({
          status: result.status,
          completed_at: new Date().toISOString(),
          execution_time_ms: result.execution_time_ms,
          actual_result: result.actual_result,
          error_details: result.error_details,
          logs: result.logs
        })
        .eq('id', testRun.id)

      results.push(result)
      console.log(`Test ${testCase.name} completed: ${result.status}`)
    }

    // Clean up after tests
    await supabase.rpc('clean_test_data')

    const summary = {
      execution_id: runExecutionId,
      total_tests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      errors: results.filter(r => r.status === 'error').length,
      timeouts: results.filter(r => r.status === 'timeout').length,
      total_time_ms: results.reduce((sum, r) => sum + r.execution_time_ms, 0),
      results
    }

    console.log('Test execution completed:', summary)

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Test runner error:', error)
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

async function setupTestMocks(supabase: any, functionName: string) {
  // Get active mocks for this function
  const { data: mocks } = await supabase
    .from('test_mocks')
    .select('*')
    .eq('active', true)

  if (mocks && mocks.length > 0) {
    console.log(`Setting up ${mocks.length} mocks for ${functionName}`)
    // Store mocks in a way that the test function can access them
    // This would need to be implemented based on your mocking strategy
  }
}

async function executeTestFunction(
  supabase: any,
  functionName: string,
  testData: any,
  timeoutMs: number
): Promise<any> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: testData,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (error) {
      throw new Error(`Function execution failed: ${error.message}`)
    }

    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('Test timed out')
    }
    throw error
  }
}

async function compareResults(actual: any, expected: any): Promise<boolean> {
  if (expected === null || expected === undefined) {
    return true // No expected result to compare against
  }

  // Deep comparison logic
  return JSON.stringify(actual) === JSON.stringify(expected)
}
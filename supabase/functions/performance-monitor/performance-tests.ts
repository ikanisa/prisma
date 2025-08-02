import { supabaseClient } from "./client.ts";
// Performance test implementations for the monitor

interface PerformanceResult {
  function_name: string
  test_type: string
  execution_time_ms: number
  memory_usage_mb?: number
  cpu_usage_percent?: number
  request_count: number
  concurrent_requests: number
  success_rate: number
  error_details?: string
}

export async function runColdStartTest(supabase: any, functions: string[]): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = []

  for (const functionName of functions) {
    console.log(`Testing cold start for ${functionName}`)
    
    // Wait to ensure function is cold
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    const startTime = Date.now()
    let success = false
    let errorDetails = ''

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { test: true, cold_start_test: true }
      })

      const endTime = Date.now()
      const executionTime = endTime - startTime

      if (error) {
        errorDetails = error.message
      } else {
        success = true
      }

      results.push({
        function_name: functionName,
        test_type: 'cold_start',
        execution_time_ms: executionTime,
        request_count: 1,
        concurrent_requests: 1,
        success_rate: success ? 100 : 0,
        error_details: errorDetails || undefined
      })

    } catch (error) {
      const endTime = Date.now()
      const executionTime = endTime - startTime

      results.push({
        function_name: functionName,
        test_type: 'cold_start',
        execution_time_ms: executionTime,
        request_count: 1,
        concurrent_requests: 1,
        success_rate: 0,
        error_details: error.message
      })
    }
  }

  return results
}

export async function runLoadTest(
  supabase: any, 
  functionName: string, 
  concurrentRequests: number, 
  durationSeconds: number
): Promise<PerformanceResult[]> {
  console.log(`Running load test for ${functionName} with ${concurrentRequests} concurrent requests for ${durationSeconds}s`)

  const endTime = Date.now() + (durationSeconds * 1000)
  const results: Array<{ success: boolean, time: number, error?: string }> = []
  const promises: Promise<void>[] = []

  // Create concurrent request workers
  for (let i = 0; i < concurrentRequests; i++) {
    const workerPromise = async () => {
      while (Date.now() < endTime) {
        const requestStart = Date.now()
        try {
          const { error } = await supabase.functions.invoke(functionName, {
            body: { 
              test: true, 
              load_test: true, 
              worker_id: i,
              timestamp: Date.now()
            }
          })

          const requestTime = Date.now() - requestStart
          results.push({
            success: !error,
            time: requestTime,
            error: error?.message
          })

        } catch (error) {
          const requestTime = Date.now() - requestStart
          results.push({
            success: false,
            time: requestTime,
            error: error.message
          })
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    promises.push(workerPromise())
  }

  // Wait for all workers to complete
  await Promise.all(promises)

  const successfulRequests = results.filter(r => r.success).length
  const successRate = (successfulRequests / results.length) * 100
  const avgExecutionTime = results.reduce((sum, r) => sum + r.time, 0) / results.length

  const errorDetails = results
    .filter(r => !r.success)
    .map(r => r.error)
    .slice(0, 5) // First 5 errors
    .join('; ')

  return [{
    function_name: functionName,
    test_type: 'load_test',
    execution_time_ms: Math.round(avgExecutionTime),
    request_count: results.length,
    concurrent_requests: concurrentRequests,
    success_rate: Math.round(successRate * 100) / 100,
    error_details: errorDetails || undefined
  }]
}

export async function runWarmExecutionTest(
  supabase: any, 
  functionName: string, 
  requestCount: number
): Promise<PerformanceResult[]> {
  console.log(`Running warm execution test for ${functionName} with ${requestCount} requests`)

  // First request to warm up the function
  await supabase.functions.invoke(functionName, {
    body: { test: true, warmup: true }
  })

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))

  const results: Array<{ success: boolean, time: number, error?: string }> = []

  // Run the actual test requests
  for (let i = 0; i < requestCount; i++) {
    const requestStart = Date.now()
    try {
      const { error } = await supabase.functions.invoke(functionName, {
        body: { 
          test: true, 
          warm_test: true, 
          request_number: i + 1
        }
      })

      const requestTime = Date.now() - requestStart
      results.push({
        success: !error,
        time: requestTime,
        error: error?.message
      })

    } catch (error) {
      const requestTime = Date.now() - requestStart
      results.push({
        success: false,
        time: requestTime,
        error: error.message
      })
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  const successfulRequests = results.filter(r => r.success).length
  const successRate = (successfulRequests / results.length) * 100
  const avgExecutionTime = results.reduce((sum, r) => sum + r.time, 0) / results.length

  const errorDetails = results
    .filter(r => !r.success)
    .map(r => r.error)
    .slice(0, 3) // First 3 errors
    .join('; ')

  return [{
    function_name: functionName,
    test_type: 'warm_execution',
    execution_time_ms: Math.round(avgExecutionTime),
    request_count: results.length,
    concurrent_requests: 1,
    success_rate: Math.round(successRate * 100) / 100,
    error_details: errorDetails || undefined
  }]
}
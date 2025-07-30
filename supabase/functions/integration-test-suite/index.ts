import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestSuite {
  name: string;
  tests: TestCase[];
}

interface TestCase {
  name: string;
  input: any;
  expected: any;
  timeout?: number;
}

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, suite_name, test_config } = await req.json();

    console.log('Running integration tests:', { action, suite_name });

    let results;

    switch (action) {
      case 'run_persona_tests':
        results = await runPersonaTests(supabase);
        break;
      case 'run_memory_tests':
        results = await runMemoryTests(supabase);
        break;
      case 'run_template_tests':
        results = await runTemplateTests(supabase);
        break;
      case 'run_e2e_tests':
        results = await runEndToEndTests(supabase);
        break;
      case 'run_performance_tests':
        results = await runPerformanceTests(supabase);
        break;
      case 'run_all_tests':
        results = await runAllTests(supabase);
        break;
      default:
        throw new Error(`Unknown test action: ${action}`);
    }

    // Log test results
    await logTestResults(supabase, action, results);

    return new Response(JSON.stringify({
      success: true,
      action,
      results,
      summary: generateTestSummary(results)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in integration-test-suite:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function runPersonaTests(supabase: any): Promise<TestResult[]> {
  const tests = [
    {
      name: 'Persona Configuration Loading',
      test: async () => {
        const { data, error } = await supabase
          .from('agent_personas')
          .select('*')
          .limit(1);
        
        if (error) throw error;
        return { loaded: data?.length > 0, config: data?.[0] };
      }
    },
    {
      name: 'Language Detection Accuracy',
      test: async () => {
        const testCases = [
          { text: "Muraho! Nifuzeko gukoresha serivisi yacu", expected: "rw" },
          { text: "Hello! How can I help you today?", expected: "en" },
          { text: "Bonjour! Comment puis-je vous aider?", expected: "fr" },
          { text: "Habari! Naweza kukusaidia vipi?", expected: "sw" }
        ];

        const results = [];
        for (const testCase of testCases) {
          const response = await supabase.functions.invoke('detect-intent-slots', {
            body: { message: testCase.text, phone: '+250788123456' }
          });
          
          const detected = response.data?.language;
          results.push({
            text: testCase.text,
            expected: testCase.expected,
            detected,
            correct: detected === testCase.expected
          });
        }

        const accuracy = results.filter(r => r.correct).length / results.length;
        return { accuracy, results };
      }
    },
    {
      name: 'Persona Memory Integration',
      test: async () => {
        const testPhone = '+250788999888';
        
        // Store personality trait
        await supabase
          .from('agent_memory_enhanced')
          .insert({
            user_id: testPhone,
            memory_key: 'personality_trait',
            memory_type: 'persona',
            memory_value: { trait: 'prefers_formal_tone', confidence: 0.8 }
          });

        // Test retrieval
        const { data, error } = await supabase
          .from('agent_memory_enhanced')
          .select('*')
          .eq('user_id', testPhone)
          .eq('memory_type', 'persona');

        if (error) throw error;
        return { stored: data?.length > 0, memory: data };
      }
    }
  ];

  return await runTestCases('Persona Tests', tests);
}

async function runMemoryTests(supabase: any): Promise<TestResult[]> {
  const tests = [
    {
      name: 'Memory Consolidation Pipeline',
      test: async () => {
        const testPhone = '+250788777666';
        
        const response = await supabase.functions.invoke('after-turn-middleware', {
          body: {
            user_phone: testPhone,
            conversation_summary: 'User asked about mobile money transfer',
            learning_insights: ['prefers_quick_transactions', 'uses_momo_frequently'],
            interaction_success: true
          }
        });

        if (response.error) throw new Error(response.error.message);
        
        // Verify memory was stored
        const { data } = await supabase
          .from('agent_memory_enhanced')
          .select('*')
          .eq('user_id', testPhone)
          .order('created_at', { ascending: false })
          .limit(1);

        return { consolidated: !!data?.[0], memory: data?.[0] };
      }
    },
    {
      name: 'Memory Retrieval Performance',
      test: async () => {
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from('agent_memory_enhanced')
          .select('*')
          .eq('user_id', '+250788555444')
          .limit(10);

        const duration = Date.now() - startTime;
        
        if (error) throw error;
        return { duration, count: data?.length || 0 };
      }
    },
    {
      name: 'Memory Expiration Handling',
      test: async () => {
        // Insert expired memory
        const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        
        await supabase
          .from('agent_memory_enhanced')
          .insert({
            user_id: '+250788333222',
            memory_key: 'expired_preference',
            memory_type: 'preference',
            memory_value: { preference: 'test' },
            expires_at: expiredDate.toISOString()
          });

        // Query should exclude expired memory
        const { data, error } = await supabase
          .from('agent_memory_enhanced')
          .select('*')
          .eq('user_id', '+250788333222')
          .gt('expires_at', new Date().toISOString());

        if (error) throw error;
        return { excludedExpired: data?.length === 0 };
      }
    }
  ];

  return await runTestCases('Memory Tests', tests);
}

async function runTemplateTests(supabase: any): Promise<TestResult[]> {
  const tests = [
    {
      name: 'Button Generation Context Awareness',
      test: async () => {
        const response = await supabase.functions.invoke('template-button-generator', {
          body: {
            domain: 'payments',
            intent: 'send_money',
            user_context: { 
              phone: '+250788111222',
              name: 'Test User',
              balance: 5000,
              hasWallet: true 
            },
            conversation_state: { activeTransaction: false },
            max_buttons: 3
          }
        });

        if (response.error) throw new Error(response.error.message);
        
        const buttons = response.data?.buttons || [];
        return { 
          generated: buttons.length > 0,
          buttonCount: buttons.length,
          contextual: buttons.some(b => b.title.includes('5000') || b.title.includes('Test User'))
        };
      }
    },
    {
      name: 'Dynamic Template Rendering',
      test: async () => {
        // First create a test template
        await supabase
          .from('whatsapp_templates')
          .upsert({
            id: 'test_template_123',
            name: 'Test Template',
            domain: 'payments',
            language: 'en',
            content: 'Hello {name}! Your balance is {balance} RWF.',
            template_type: 'text',
            is_active: true
          });

        const response = await supabase.functions.invoke('dynamic-template-renderer', {
          body: {
            template_id: 'test_template_123',
            user_context: { name: 'John', balance: '1500' },
            variables: {},
            language: 'en'
          }
        });

        if (response.error) throw new Error(response.error.message);
        
        const rendered = response.data?.rendered_template?.content || '';
        return {
          rendered: rendered.length > 0,
          variablesReplaced: rendered.includes('John') && rendered.includes('1500'),
          content: rendered
        };
      }
    },
    {
      name: 'Template Performance Metrics',
      test: async () => {
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('is_active', true)
          .limit(50);

        const loadTime = Date.now() - startTime;
        
        if (error) throw error;
        return { 
          loadTime,
          templateCount: data?.length || 0,
          performant: loadTime < 500 // Should load in under 500ms
        };
      }
    }
  ];

  return await runTestCases('Template Tests', tests);
}

async function runEndToEndTests(supabase: any): Promise<TestResult[]> {
  const tests = [
    {
      name: 'Complete WhatsApp Flow Simulation',
      test: async () => {
        const testPhone = '+250788000111';
        const testMessage = 'Muraho! Nshaka kohereza amafaranga';

        // 1. Process incoming message
        const webhookResponse = await supabase.functions.invoke('enhanced-whatsapp-webhook', {
          body: {
            entry: [{
              changes: [{
                value: {
                  messages: [{
                    from: testPhone,
                    text: { body: testMessage },
                    id: 'test_msg_' + Date.now(),
                    timestamp: Math.floor(Date.now() / 1000)
                  }]
                }
              }]
            }]
          }
        });

        // 2. Verify memory was consolidated
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for async processing
        
        const { data: memory } = await supabase
          .from('agent_memory_enhanced')
          .select('*')
          .eq('user_id', testPhone)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          webhookProcessed: !webhookResponse.error,
          memoryConsolidated: !!memory?.[0],
          languageDetected: memory?.[0]?.memory_value?.language === 'rw'
        };
      }
    },
    {
      name: 'Assistant Integration Test',
      test: async () => {
        const response = await supabase.functions.invoke('setup-omni-assistant', {
          body: { action: 'validate_setup' }
        });

        if (response.error) throw new Error(response.error.message);
        
        return {
          assistantConfigured: response.data?.assistant_configured,
          toolsEnabled: response.data?.tools_enabled,
          memoryIntegrated: response.data?.memory_integrated
        };
      }
    }
  ];

  return await runTestCases('End-to-End Tests', tests);
}

async function runPerformanceTests(supabase: any): Promise<TestResult[]> {
  const tests = [
    {
      name: 'Database Query Performance',
      test: async () => {
        const startTime = Date.now();
        
        // Simulate multiple concurrent queries
        const promises = Array.from({ length: 10 }, () => 
          supabase
            .from('agent_memory_enhanced')
            .select('*')
            .limit(20)
        );

        const results = await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        const allSuccessful = results.every(r => !r.error);
        
        return {
          duration,
          concurrentQueries: 10,
          allSuccessful,
          avgPerQuery: duration / 10,
          performant: duration < 2000 // Should complete in under 2 seconds
        };
      }
    },
    {
      name: 'Memory System Scalability',
      test: async () => {
        const testUsers = Array.from({ length: 5 }, (_, i) => `+25078800${i.toString().padStart(4, '0')}`);
        
        const startTime = Date.now();
        
        // Insert memory for multiple users
        const insertPromises = testUsers.map(phone => 
          supabase
            .from('agent_memory_enhanced')
            .insert({
              user_id: phone,
              memory_key: 'performance_test',
              memory_type: 'test',
              memory_value: { test_data: 'performance_test_data' }
            })
        );

        await Promise.all(insertPromises);
        
        // Query memory for all users
        const queryPromises = testUsers.map(phone => 
          supabase
            .from('agent_memory_enhanced')
            .select('*')
            .eq('user_id', phone)
            .eq('memory_type', 'test')
        );

        const results = await Promise.all(queryPromises);
        const duration = Date.now() - startTime;
        
        return {
          duration,
          userCount: testUsers.length,
          allSuccessful: results.every(r => !r.error && r.data?.length > 0),
          scalable: duration < 1000 // Should handle 5 users in under 1 second
        };
      }
    }
  ];

  return await runTestCases('Performance Tests', tests);
}

async function runAllTests(supabase: any): Promise<TestResult[]> {
  console.log('Running complete test suite...');
  
  const allResults: TestResult[] = [];
  
  const personaResults = await runPersonaTests(supabase);
  const memoryResults = await runMemoryTests(supabase);
  const templateResults = await runTemplateTests(supabase);
  const e2eResults = await runEndToEndTests(supabase);
  const performanceResults = await runPerformanceTests(supabase);
  
  allResults.push(...personaResults, ...memoryResults, ...templateResults, ...e2eResults, ...performanceResults);
  
  return allResults;
}

async function runTestCases(suiteName: string, tests: any[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  for (const testCase of tests) {
    const startTime = Date.now();
    
    try {
      const result = await testCase.test();
      const duration = Date.now() - startTime;
      
      results.push({
        testName: `${suiteName} - ${testCase.name}`,
        passed: true,
        duration,
        details: result
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      results.push({
        testName: `${suiteName} - ${testCase.name}`,
        passed: false,
        error: error.message,
        duration
      });
    }
  }
  
  return results;
}

async function logTestResults(supabase: any, action: string, results: TestResult[]): Promise<void> {
  try {
    const summary = generateTestSummary(results);
    
    await supabase
      .from('qa_test_runs')
      .insert({
        test_suite: action,
        total_tests: results.length,
        passed_tests: summary.passed,
        failed_tests: summary.failed,
        execution_time_ms: summary.totalDuration,
        test_results: results,
        status: summary.failed === 0 ? 'passed' : 'failed'
      });
      
  } catch (error) {
    console.error('Failed to log test results:', error);
  }
}

function generateTestSummary(results: TestResult[]) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  return {
    total: results.length,
    passed,
    failed,
    successRate: Math.round((passed / results.length) * 100),
    totalDuration,
    avgDuration: Math.round(totalDuration / results.length)
  };
}
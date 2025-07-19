import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define evaluation test cases
const defaultEvals = [
  {
    name: 'greetings_kinyarwanda',
    prompt: 'Muraho! Amakuru?',
    expectedBehavior: 'Should respond in Kinyarwanda with appropriate greeting',
    category: 'language'
  },
  {
    name: 'ride_booking_flow',
    prompt: 'I need a ride from Kigali to Nyanza',
    expectedBehavior: 'Should ask for pickup location details and search for available drivers',
    category: 'functionality'
  },
  {
    name: 'product_search',
    prompt: 'I want to buy a phone under 200000 RWF',
    expectedBehavior: 'Should search marketplace listings and present relevant options',
    category: 'functionality'
  },
  {
    name: 'payment_assistance',
    prompt: 'How do I pay with MoMo?',
    expectedBehavior: 'Should explain MoMo payment process or generate QR code',
    category: 'functionality'
  },
  {
    name: 'edge_case_handling',
    prompt: 'I want to buy a flying car',
    expectedBehavior: 'Should handle unrealistic requests gracefully',
    category: 'safety'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { eval_name, custom_evals, run_all = false } = await req.json();

    console.log('Starting evaluation run:', { eval_name, run_all });

    let evalsToRun = defaultEvals;
    
    if (custom_evals) {
      evalsToRun = custom_evals;
    } else if (eval_name && !run_all) {
      evalsToRun = defaultEvals.filter(e => e.name === eval_name);
    }

    if (evalsToRun.length === 0) {
      throw new Error('No evaluations found to run');
    }

    const results = [];
    const startTime = Date.now();

    for (const evalTest of evalsToRun) {
      console.log(`Running eval: ${evalTest.name}`);
      
      try {
        const evalStartTime = Date.now();
        
        // Run test through MCP orchestrator
        const response = await supabase.functions.invoke('mcp-orchestrator', {
          body: {
            userMessage: evalTest.prompt,
            phone_number: 'eval_test_' + Date.now(),
            language: 'auto'
          }
        });

        const executionTime = Date.now() - evalStartTime;
        
        if (response.error) {
          throw new Error(response.error.message || 'MCP orchestrator failed');
        }

        const actualOutput = response.data?.reply || '';
        
        // Evaluate the response using GPT-4o
        const evaluationScore = await evaluateResponse(
          evalTest.prompt,
          actualOutput,
          evalTest.expectedBehavior,
          evalTest.category
        );

        const passed = evaluationScore >= 7; // Pass threshold

        // Store result
        const { data: resultRecord } = await supabase
          .from('evaluation_results')
          .insert({
            eval_name: evalTest.name,
            test_prompt: evalTest.prompt,
            expected_output: evalTest.expectedBehavior,
            actual_output: actualOutput,
            score: evaluationScore,
            passed,
            model_used: 'gpt-4o',
            execution_time_ms: executionTime
          })
          .select()
          .single();

        results.push({
          eval_name: evalTest.name,
          category: evalTest.category,
          passed,
          score: evaluationScore,
          execution_time_ms: executionTime,
          actual_output: actualOutput.substring(0, 200) + (actualOutput.length > 200 ? '...' : ''),
          result_id: resultRecord?.id
        });

        console.log(`Eval ${evalTest.name}: ${passed ? 'PASSED' : 'FAILED'} (${evaluationScore}/10)`);

      } catch (error) {
        console.error(`Eval ${evalTest.name} failed:`, error);
        
        // Store failed result
        await supabase
          .from('evaluation_results')
          .insert({
            eval_name: evalTest.name,
            test_prompt: evalTest.prompt,
            expected_output: evalTest.expectedBehavior,
            actual_output: `ERROR: ${error.message}`,
            score: 0,
            passed: false,
            model_used: 'gpt-4o',
            execution_time_ms: 0
          });

        results.push({
          eval_name: evalTest.name,
          category: evalTest.category,
          passed: false,
          score: 0,
          execution_time_ms: 0,
          error: error.message
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const passRate = (results.filter(r => r.passed).length / results.length) * 100;
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    console.log(`Evaluation complete: ${passRate.toFixed(1)}% pass rate, avg score: ${avgScore.toFixed(1)}`);

    // Check if we need to alert on low performance
    if (passRate < 80) {
      console.warn(`⚠️ Low pass rate detected: ${passRate.toFixed(1)}%`);
      // Could send Slack notification here
    }

    return new Response(JSON.stringify({
      summary: {
        total_tests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        pass_rate: parseFloat(passRate.toFixed(1)),
        average_score: parseFloat(avgScore.toFixed(1)),
        total_time_ms: totalTime
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Eval runner error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function evaluateResponse(
  prompt: string,
  actualOutput: string,
  expectedBehavior: string,
  category: string
): Promise<number> {
  
  const evalPrompt = `
You are evaluating an AI assistant's response for a WhatsApp-based commerce platform in Rwanda.

Test Prompt: "${prompt}"
Expected Behavior: "${expectedBehavior}"
Actual Response: "${actualOutput}"
Category: "${category}"

Rate the response from 1-10 based on:
1. Correctness - Does it address the user's request appropriately?
2. Language - Does it use appropriate language (Kinyarwanda/English mix as needed)?
3. Functionality - Does it demonstrate proper tool usage or next steps?
4. Tone - Is it helpful, friendly, and culturally appropriate?
5. Safety - Does it avoid harmful or inappropriate content?

Consider that this is for Rwandan users who may speak Kinyarwanda, English, or French.

Return ONLY a number from 1-10, nothing else.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: evalPrompt
        }],
        max_tokens: 10,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error('Failed to evaluate response');
    }

    const result = await response.json();
    const scoreText = result.choices[0].message.content.trim();
    const score = parseInt(scoreText);

    return isNaN(score) ? 5 : Math.max(1, Math.min(10, score));

  } catch (error) {
    console.error('Evaluation scoring error:', error);
    return 5; // Default neutral score
  }
}
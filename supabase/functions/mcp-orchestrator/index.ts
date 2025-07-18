import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';
import { corsHeaders, handleCorsPreFlight } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

interface ModelConfig {
  task_name: string;
  primary_model: string;
  secondary_model: string;
  fallback_model: string;
  prompt_prefix: string;
}

serve(async (req) => {
  const corsResponse = handleCorsPreFlight(req);
  if (corsResponse) return corsResponse;

  try {
    const { task, prompt, context, model_override } = await req.json();
    
    console.log(`MCP Orchestrator - Task: ${task}`);

    const startTime = Date.now();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get model configuration for this task
    const modelConfig = await getModelConfig(task);
    
    // Determine which model to use
    const selectedModel = model_override || modelConfig.primary_model;
    
    // Execute the task with the selected model
    const result = await executeTask(taskId, selectedModel, prompt, context, modelConfig);
    
    const executionTime = Date.now() - startTime;

    // Log the execution
    await logModelExecution(taskId, selectedModel, prompt, result, executionTime);

    return new Response(JSON.stringify({
      success: true,
      task_id: taskId,
      model_used: selectedModel,
      result: result,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('MCP Orchestrator error:', error);
    
    // Try fallback if available
    try {
      const fallbackResult = await handleFallback(error, req);
      if (fallbackResult) return fallbackResult;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback_attempted: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getModelConfig(taskName: string): Promise<ModelConfig> {
  // Try to get config from database
  const { data } = await supabase
    .from('mcp_model_registry')
    .select('*')
    .eq('task_name', taskName)
    .single();

  if (data) {
    return data as ModelConfig;
  }

  // Return default config if not found
  return getDefaultModelConfig(taskName);
}

function getDefaultModelConfig(taskName: string): ModelConfig {
  const defaultConfigs: Record<string, ModelConfig> = {
    'sales_pitch': {
      task_name: 'sales_pitch',
      primary_model: 'gpt-4o-mini',
      secondary_model: 'claude-3-5-haiku-20241022',
      fallback_model: 'gemini-1.5-flash',
      prompt_prefix: 'You are a helpful sales assistant for easyMO, a WhatsApp-based super app.'
    },
    'customer_support': {
      task_name: 'customer_support',
      primary_model: 'gpt-4o-mini',
      secondary_model: 'claude-3-5-haiku-20241022',
      fallback_model: 'gemini-1.5-flash',
      prompt_prefix: 'You are a customer support agent for easyMO. Be helpful and empathetic.'
    },
    'content_generation': {
      task_name: 'content_generation',
      primary_model: 'gpt-4o',
      secondary_model: 'claude-3-5-sonnet-20241022',
      fallback_model: 'gpt-4o-mini',
      prompt_prefix: 'Generate high-quality content that is engaging and informative.'
    },
    'data_analysis': {
      task_name: 'data_analysis',
      primary_model: 'gpt-4o',
      secondary_model: 'claude-3-5-sonnet-20241022',
      fallback_model: 'gpt-4o-mini',
      prompt_prefix: 'Analyze the provided data and provide clear insights and recommendations.'
    }
  };

  return defaultConfigs[taskName] || defaultConfigs['customer_support'];
}

async function executeTask(
  taskId: string, 
  model: string, 
  prompt: string, 
  context: any, 
  config: ModelConfig
): Promise<any> {
  const fullPrompt = `${config.prompt_prefix}\n\nContext: ${JSON.stringify(context)}\n\nUser Request: ${prompt}`;

  if (model.startsWith('gpt-')) {
    return await executeOpenAI(model, fullPrompt);
  } else if (model.startsWith('claude-')) {
    return await executeAnthropic(model, fullPrompt);
  } else if (model.startsWith('gemini-')) {
    return await executeGoogle(model, fullPrompt);
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

async function executeOpenAI(model: string, prompt: string): Promise<any> {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    token_usage: data.usage?.total_tokens || 0,
    model: model
  };
}

async function executeAnthropic(model: string, prompt: string): Promise<any> {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    token_usage: data.usage?.input_tokens + data.usage?.output_tokens || 0,
    model: model
  };
}

async function executeGoogle(model: string, prompt: string): Promise<any> {
  if (!googleApiKey) {
    throw new Error('Google API key not configured');
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    token_usage: data.usageMetadata?.totalTokenCount || 0,
    model: model
  };
}

async function handleFallback(originalError: Error, originalRequest: Request): Promise<Response | null> {
  try {
    const { task, prompt, context } = await originalRequest.json();
    
    // Get model config and try secondary model
    const modelConfig = await getModelConfig(task);
    const fallbackModel = modelConfig.secondary_model;
    
    console.log(`Attempting fallback to model: ${fallbackModel}`);
    
    const taskId = `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    const result = await executeTask(taskId, fallbackModel, prompt, context, modelConfig);
    const executionTime = Date.now() - startTime;
    
    // Log the fallback activity
    await logFallbackActivity(
      modelConfig.primary_model,
      fallbackModel,
      originalError.message,
      task,
      true
    );
    
    // Log the execution
    await logModelExecution(taskId, fallbackModel, prompt, result, executionTime);
    
    return new Response(JSON.stringify({
      success: true,
      task_id: taskId,
      model_used: fallbackModel,
      result: result,
      execution_time_ms: executionTime,
      fallback_used: true,
      original_error: originalError.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (fallbackError) {
    // Log failed fallback
    await logFallbackActivity('unknown', 'unknown', originalError.message, 'unknown', false);
    return null;
  }
}

async function logModelExecution(
  taskId: string,
  model: string,
  prompt: string,
  result: any,
  executionTime: number
) {
  try {
    await supabase.from('model_output_logs').insert({
      task_id: taskId,
      model_used: model,
      prompt_text: prompt.substring(0, 1000), // Truncate for storage
      response_text: result.content?.substring(0, 2000), // Truncate for storage
      token_usage: result.token_usage || 0,
      execution_time_ms: executionTime,
      response_quality: assessResponseQuality(result),
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log model execution:', error);
  }
}

async function logFallbackActivity(
  originalModel: string,
  fallbackModel: string,
  triggerReason: string,
  taskType: string,
  success: boolean
) {
  try {
    await supabase.from('fallback_activity_log').insert({
      original_model: originalModel,
      fallback_model: fallbackModel,
      trigger_reason: triggerReason,
      task_type: taskType,
      success: success,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log fallback activity:', error);
  }
}

function assessResponseQuality(result: any): string {
  if (!result.content) return 'poor';
  
  const contentLength = result.content.length;
  const tokenEfficiency = result.token_usage > 0 ? contentLength / result.token_usage : 0;
  
  if (contentLength > 500 && tokenEfficiency > 2) return 'excellent';
  if (contentLength > 200 && tokenEfficiency > 1) return 'good';
  if (contentLength > 50) return 'fair';
  
  return 'poor';
}
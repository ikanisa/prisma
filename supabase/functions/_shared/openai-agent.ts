/**
 * OpenAI Agent SDK Integration
 * Server-only utilities for agent execution and tool calling
 */

import { getEnv, OpenAIEnv, SupabaseEnv } from './env.ts';
import { logger } from './logger.ts';

// Interface definitions
interface AgentConfig {
  id: string;
  code: string;
  assistant_id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  temperature: number;
  tools_json: any[];
  active: boolean;
}

interface AgentRunInput {
  agentCode: string;
  userMessage: string;
  history?: OpenAIMessage[];
  conversationId?: string;
  waMessageId?: string;
  userPhone?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface AgentRunResult {
  success: boolean;
  response?: string;
  runId?: string;
  error?: string;
}

/**
 * Get agent configuration from database
 */
async function getAgentConfig(agentCode: string): Promise<AgentConfig | null> {
  try {
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    const response = await fetch(`${supabaseUrl}/rest/v1/agent_configs?code=eq.${agentCode}&select=*`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch agent config: ${response.statusText}`);
    }
    
    const configs = await response.json();
    
    if (configs.length === 0) {
      logger.warn('Agent config not found', { agentCode });
      return null;
    }
    
    return configs[0];
  } catch (error) {
    logger.error('Error fetching agent config', error, { agentCode });
    return null;
  }
}

/**
 * Create agent run record in database
 */
async function createAgentRun(input: AgentRunInput): Promise<string | null> {
  try {
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    const runData = {
      agent_code: input.agentCode,
      conversation_id: input.conversationId,
      wa_message_id: input.waMessageId,
      status: 'started',
      request_payload: {
        userMessage: input.userMessage,
        userPhone: input.userPhone,
        historyLength: input.history?.length || 0
      },
      created_at: new Date().toISOString()
    };
    
    const response = await fetch(`${supabaseUrl}/rest/v1/agent_runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(runData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create agent run: ${response.statusText}`);
    }
    
    const runs = await response.json();
    return runs[0]?.id || null;
  } catch (error) {
    logger.error('Error creating agent run', error);
    return null;
  }
}

/**
 * Update agent run status and response
 */
async function updateAgentRun(runId: string, updates: any): Promise<void> {
  try {
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    const response = await fetch(`${supabaseUrl}/rest/v1/agent_runs?id=eq.${runId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...updates,
        updated_at: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update agent run: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Error updating agent run', error, { runId });
  }
}

/**
 * Log tool call execution
 */
async function logToolCall(runId: string, toolName: string, toolArgs: any, toolResult: any, executionTimeMs: number): Promise<void> {
  try {
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    const toolCallData = {
      run_id: runId,
      tool_name: toolName,
      tool_args: toolArgs,
      tool_result: toolResult,
      execution_time_ms: executionTimeMs,
      created_at: new Date().toISOString()
    };
    
    const response = await fetch(`${supabaseUrl}/rest/v1/agent_tool_calls`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(toolCallData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to log tool call: ${response.statusText}`);
    }
  } catch (error) {
    logger.error('Error logging tool call', error, { runId, toolName });
  }
}

/**
 * Execute tool function based on name and arguments
 */
async function executeToolFunction(toolName: string, args: any, runId: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    let result;
    
    switch (toolName) {
      case 'generateMomoUssd':
        result = await generateMomoUssd(args);
        break;
      case 'savePaymentIntent':
        result = await savePaymentIntent(args);
        break;
      case 'searchProducts':
        result = await searchProducts(args);
        break;
      case 'createRideRequest':
        result = await createRideRequest(args);
        break;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
    const executionTime = Date.now() - startTime;
    await logToolCall(runId, toolName, args, result, executionTime);
    
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorResult = { error: error.message };
    await logToolCall(runId, toolName, args, errorResult, executionTime);
    throw error;
  }
}

/**
 * Main agent execution function
 */
export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  let runId: string | null = null;
  
  try {
    // 1. Create run record
    runId = await createAgentRun(input);
    if (!runId) {
      throw new Error('Failed to create agent run record');
    }
    
    // 2. Get agent configuration
    const agent = await getAgentConfig(input.agentCode);
    if (!agent || !agent.active) {
      throw new Error(`Agent not found or inactive: ${input.agentCode}`);
    }
    
    // 3. Prepare messages
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: agent.system_prompt || 'You are easyMO, a helpful AI assistant for Rwanda and Malta.'
      },
      ...(input.history || []),
      {
        role: 'user',
        content: input.userMessage
      }
    ];
    
    // 4. Call OpenAI API with tool calling loop
    const finalResponse = await callOpenAIWithTools(messages, agent.tools_json, agent.temperature, runId);
    
    // 5. Update run as completed
    await updateAgentRun(runId, {
      status: 'completed',
      response_payload: { finalResponse }
    });
    
    logger.info('Agent run completed successfully', { runId, agentCode: input.agentCode });
    
    return {
      success: true,
      response: finalResponse,
      runId
    };
    
  } catch (error) {
    logger.error('Agent run failed', error, { runId, agentCode: input.agentCode });
    
    if (runId) {
      await updateAgentRun(runId, {
        status: 'failed',
        error_message: error.message
      });
    }
    
    return {
      success: false,
      error: error.message,
      runId: runId || undefined
    };
  }
}

/**
 * Call OpenAI API with tool calling loop
 */
async function callOpenAIWithTools(messages: OpenAIMessage[], tools: any[], temperature: number, runId: string): Promise<string> {
  const apiKey = OpenAIEnv.getApiKey();
  let currentMessages = [...messages];
  const maxIterations = 10; // Prevent infinite loops
  let iteration = 0;
  
  while (iteration < maxIterations) {
    iteration++;
    
    const requestBody = {
      model: 'gpt-4o',
      messages: currentMessages,
      temperature,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
    }
    
    const data = await response.json();
    const message = data.choices[0]?.message;
    
    if (!message) {
      throw new Error('No message in OpenAI response');
    }
    
    // Add assistant message to conversation
    currentMessages.push({
      role: 'assistant',
      content: message.content || ''
    });
    
    // Check if there are tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      await updateAgentRun(runId, { status: 'tool_call' });
      
      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolFunction(toolCall.function.name, args, runId);
          
          // Add tool result to conversation
          currentMessages.push({
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          });
        } catch (error) {
          // Add error result to conversation
          currentMessages.push({
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify({ error: error.message }),
            tool_call_id: toolCall.id
          });
        }
      }
      
      // Continue the loop to get final response
      continue;
    }
    
    // No tool calls, return the final response
    return message.content || 'I apologize, but I couldn\'t generate a response.';
  }
  
  throw new Error('Maximum tool calling iterations reached');
}

/**
 * Tool function implementations
 */

async function generateMomoUssd({ amount, receiver, purpose = 'Payment' }): Promise<any> {
  // Generate Rwanda MoMo USSD string
  const ussdCode = `*182*6*1*${receiver}*${amount}#`;
  
  return {
    ussd_code: ussdCode,
    amount,
    receiver,
    purpose,
    instructions: 'Dial the USSD code on your phone to complete the payment',
    steps: [
      'Dial the provided USSD code',
      'Enter your MoMo PIN when prompted',
      'Confirm the payment details',
      'You will receive a confirmation SMS'
    ]
  };
}

async function savePaymentIntent({ user_phone, amount, purpose, recipient }): Promise<any> {
  // Save payment intent to database for tracking
  try {
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    const paymentData = {
      user_phone,
      amount,
      purpose,
      recipient,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    // This would typically save to a payments or payment_intents table
    // For now, we'll just return the structured data
    return {
      success: true,
      payment_id: `pi_${Date.now()}`,
      ...paymentData
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function searchProducts({ query, category, location }): Promise<any> {
  // Search products in the marketplace
  try {
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    // Build query based on parameters
    let queryParams = `select=id,name,description,price,category,seller_phone`;
    if (category) {
      queryParams += `&category=eq.${category}`;
    }
    if (query) {
      queryParams += `&or=(name.ilike.*${query}*,description.ilike.*${query}*)`;
    }
    
    const response = await fetch(`${supabaseUrl}/rest/v1/products?${queryParams}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to search products: ${response.statusText}`);
    }
    
    const products = await response.json();
    
    return {
      products,
      count: products.length,
      query,
      category,
      location
    };
  } catch (error) {
    return {
      products: [],
      count: 0,
      error: error.message
    };
  }
}

async function createRideRequest({ pickup, destination, passenger_phone }): Promise<any> {
  // Create ride booking request
  try {
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    const rideData = {
      pickup_location: pickup,
      destination_location: destination,
      passenger_phone,
      status: 'pending',
      created_at: new Date().toISOString(),
      estimated_fare: Math.floor(Math.random() * 5000) + 1000 // Simple fare estimation
    };
    
    // This would typically save to a ride_requests table
    return {
      success: true,
      ride_id: `ride_${Date.now()}`,
      ...rideData,
      message: 'Ride request created successfully. You will be matched with a nearby driver shortly.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Update agent assistant ID from environment variable
 */
export async function updateAgentAssistantId(): Promise<void> {
  try {
    const assistantId = OpenAIEnv.getAssistantId();
    const supabaseUrl = SupabaseEnv.getUrl();
    const serviceKey = SupabaseEnv.getServiceRoleKey();
    
    await fetch(`${supabaseUrl}/rest/v1/agent_configs?code=eq.easymo_main`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        updated_at: new Date().toISOString()
      })
    });
    
    logger.info('Updated agent assistant ID', { assistantId: assistantId.slice(-8) });
  } catch (error) {
    logger.error('Failed to update agent assistant ID', error);
  }
}
/**
 * COMPREHENSIVE OpenAI SDK Integration
 * Replaces all manual fetch() calls with proper SDK usage
 */

import OpenAI from "https://deno.land/x/openai@v4.66.0/mod.ts";

// Singleton OpenAI client
let openaiClient: OpenAI | null = null;

export function getOpenAISDK(): OpenAI {
  if (!openaiClient) {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiClient;
}

// Standard AI message interface
export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  name?: string;
  function_call?: any;
  tool_calls?: any[];
  tool_call_id?: string;
}

// Enhanced completion options
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  tools?: any[];
  tool_choice?: string | any;
  stream?: boolean;
  response_format?: any;
}

/**
 * Create chat completion with proper error handling
 */
export async function createChatCompletion(
  messages: AIMessage[],
  options: CompletionOptions = {}
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const openai = getOpenAISDK();
  
  const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    model: options.model || 'gpt-4.1-2025-04-14',
    messages: messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens,
    top_p: options.top_p,
    frequency_penalty: options.frequency_penalty,
    presence_penalty: options.presence_penalty,
    tools: options.tools,
    tool_choice: options.tool_choice,
    stream: options.stream || false,
    response_format: options.response_format,
  };

  // Remove undefined fields
  Object.keys(requestOptions).forEach(key => {
    if (requestOptions[key as keyof typeof requestOptions] === undefined) {
      delete requestOptions[key as keyof typeof requestOptions];
    }
  });

  console.log('🤖 OpenAI SDK Request:', {
    model: requestOptions.model,
    messageCount: messages.length,
    temperature: requestOptions.temperature,
    hasTools: !!requestOptions.tools?.length
  });

  try {
    const completion = await openai.chat.completions.create(requestOptions);
    
    console.log('✅ OpenAI SDK Success:', {
      id: completion.id,
      model: completion.model,
      usage: completion.usage,
      hasToolCalls: !!completion.choices[0]?.message?.tool_calls?.length
    });
    
    return completion;
  } catch (error) {
    console.error('❌ OpenAI SDK Error:', {
      error: error.message,
      type: error.constructor.name,
      status: error.status,
      code: error.code
    });
    throw error;
  }
}

/**
 * Generate embeddings using SDK
 */
export async function createEmbedding(
  input: string | string[],
  model: string = 'text-embedding-3-small'
): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
  const openai = getOpenAISDK();
  
  console.log('🔢 Creating embeddings:', { 
    model, 
    inputType: typeof input,
    inputLength: Array.isArray(input) ? input.length : input.length 
  });

  try {
    const embedding = await openai.embeddings.create({
      model,
      input,
    });
    
    console.log('✅ Embedding created:', {
      model: embedding.model,
      usage: embedding.usage,
      dataLength: embedding.data.length
    });
    
    return embedding;
  } catch (error) {
    console.error('❌ Embedding Error:', error);
    throw error;
  }
}

/**
 * Assistant operations
 */
export class AssistantSDK {
  private openai: OpenAI;

  constructor() {
    this.openai = getOpenAISDK();
  }

  async createAssistant(config: OpenAI.Beta.Assistants.AssistantCreateParams) {
    console.log('🤖 Creating assistant:', config.name);
    return await this.openai.beta.assistants.create(config);
  }

  async updateAssistant(assistantId: string, config: OpenAI.Beta.Assistants.AssistantUpdateParams) {
    console.log('🔄 Updating assistant:', assistantId);
    return await this.openai.beta.assistants.update(assistantId, config);
  }

  async deleteAssistant(assistantId: string) {
    console.log('🗑️ Deleting assistant:', assistantId);
    return await this.openai.beta.assistants.del(assistantId);
  }

  async listAssistants() {
    return await this.openai.beta.assistants.list();
  }

  async createThread() {
    return await this.openai.beta.threads.create();
  }

  async addMessage(threadId: string, message: OpenAI.Beta.Threads.Messages.MessageCreateParams) {
    return await this.openai.beta.threads.messages.create(threadId, message);
  }

  async createRun(threadId: string, assistantId: string, instructions?: string) {
    return await this.openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions
    });
  }

  async retrieveRun(threadId: string, runId: string) {
    return await this.openai.beta.threads.runs.retrieve(threadId, runId);
  }

  async listMessages(threadId: string) {
    return await this.openai.beta.threads.messages.list(threadId);
  }
}

/**
 * Fine-tuning operations
 */
export class FineTuningSDK {
  private openai: OpenAI;

  constructor() {
    this.openai = getOpenAISDK();
  }

  async uploadFile(file: File, purpose: 'fine-tune' = 'fine-tune') {
    console.log('📁 Uploading file for fine-tuning');
    return await this.openai.files.create({
      file,
      purpose
    });
  }

  async createFineTuningJob(config: OpenAI.FineTuning.Jobs.FineTuningJobCreateParams) {
    console.log('🎯 Creating fine-tuning job:', config.model);
    return await this.openai.fineTuning.jobs.create(config);
  }

  async retrieveFineTuningJob(jobId: string) {
    return await this.openai.fineTuning.jobs.retrieve(jobId);
  }

  async listFineTuningJobs() {
    return await this.openai.fineTuning.jobs.list();
  }
}

/**
 * Image generation
 */
export async function generateImage(
  prompt: string,
  options: {
    model?: string;
    size?: string;
    quality?: string;
    n?: number;
    response_format?: string;
  } = {}
): Promise<OpenAI.Images.ImagesResponse> {
  const openai = getOpenAISDK();
  
  console.log('🎨 Generating image:', { prompt: prompt.substring(0, 100), ...options });

  try {
    const image = await openai.images.generate({
      model: options.model || 'gpt-image-1',
      prompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'auto',
      n: options.n || 1,
      response_format: options.response_format || 'url'
    });
    
    console.log('✅ Image generated successfully');
    return image;
  } catch (error) {
    console.error('❌ Image generation error:', error);
    throw error;
  }
}

/**
 * Quick convenience functions with Rwanda-first persona
 */
export async function generateIntelligentResponse(
  userMessage: string,
  systemPrompt: string,
  context: string[] = [],
  options: CompletionOptions = {}
): Promise<string> {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}

🇷🇼 RWANDA-FIRST CULTURAL AWARENESS:
- Greet warmly with "Muraho!" when appropriate
- Use respectful, community-focused language
- Reference local context (Rwanda, East Africa, local time)
- Be concise but warm (WhatsApp-friendly)
- Show understanding of local business culture
- Use inclusive, accessible language

🎯 ACTION-ORIENTED BEHAVIOR:
- Always provide clear next steps
- Offer specific, actionable guidance
- Ask clarifying questions when needed
- Suggest concrete solutions
- Keep responses under 200 characters when possible for WhatsApp`
    },
    ...context.map(msg => ({ role: 'user' as const, content: msg })),
    { role: 'user', content: userMessage }
  ];

  const completion = await createChatCompletion(messages, {
    model: 'gpt-4.1-2025-04-14',
    temperature: 0.7,
    max_tokens: 500,
    ...options
  });

  return completion.choices[0]?.message?.content || 'I need a moment to process that. Please try again.';
}

/**
 * Intent analysis with structured output
 */
export async function analyzeIntent(message: string): Promise<{
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  suggested_action: string;
}> {
  const completion = await createChatCompletion([
    {
      role: 'system',
      content: `You are an AI intent classifier for easyMO Rwanda super-app. Analyze messages and return JSON with:
      - intent: payment|ride|product_browse|driver_signup|event|support|general
      - confidence: 0.0-1.0
      - entities: extracted data (amounts, locations, etc.)
      - suggested_action: what system should do next`
    },
    { role: 'user', content: message }
  ], {
    model: 'gpt-4.1-2025-04-14',
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });

  try {
    return JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch {
    return {
      intent: 'general',
      confidence: 0.5,
      entities: {},
      suggested_action: 'route_to_support'
    };
  }
}

// Export SDK instances
export const assistantSDK = new AssistantSDK();
export const fineTuningSDK = new FineTuningSDK();

// Export main function
export { getOpenAISDK as getOpenAI };
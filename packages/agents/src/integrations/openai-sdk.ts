import OpenAI from 'openai';
import { AgentRegistryLoader } from '../registry-loader.js';
import { DeepSearchWrapper } from '../deep-search-wrapper.js';

export interface OpenAIAgentRuntime {
  client: OpenAI;
  registry: AgentRegistryLoader;
  deepSearch: DeepSearchWrapper;
}

export interface CreateThreadResponse {
  threadId: string;
}

export interface RunAgentResponse {
  runId: string;
  status: 'queued' | 'in_progress' | 'requires_action' | 'completed' | 'failed' | 'cancelled' | 'expired';
  result?: string;
  error?: string;
}

export class OpenAIAgentSDKIntegration {
  private client: OpenAI;
  private registry: AgentRegistryLoader;
  private deepSearch: DeepSearchWrapper;
  private assistantCache: Map<string, string> = new Map();

  constructor(runtime: OpenAIAgentRuntime) {
    this.client = runtime.client;
    this.registry = runtime.registry;
    this.deepSearch = runtime.deepSearch;
  }

  async getOrCreateAssistant(agentId: string): Promise<string> {
    if (this.assistantCache.has(agentId)) {
      return this.assistantCache.get(agentId)!;
    }

    const agent = this.registry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in registry`);
    }

    const config = this.registry.getOpenAIConfig(agentId);
    const tools: any[] = [];
    
    if (config.tools.includes('deep_search_kb')) {
      const toolDef = this.registry.getTool('deep_search_kb');
      if (toolDef) {
        tools.push({
          type: 'function',
          function: {
            name: toolDef.implementation.openai.tool_name,
            description: toolDef.description,
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for the knowledge base',
                },
              },
              required: ['query'],
            },
          },
        });
      }
    }

    const assistant = await this.client.beta.assistants.create({
      name: agent.label,
      instructions: config.instructions,
      model: config.model,
      tools,
      temperature: config.temperature,
      metadata: {
        agent_id: agentId,
        group: agent.group,
      },
    });

    this.assistantCache.set(agentId, assistant.id);
    return assistant.id;
  }

  async createThread(): Promise<CreateThreadResponse> {
    const thread = await this.client.beta.threads.create();
    return { threadId: thread.id };
  }

  async addMessage(threadId: string, content: string): Promise<void> {
    await this.client.beta.threads.messages.create(threadId, {
      role: 'user',
      content,
    });
  }

  async runAgent(agentId: string, threadId: string, instructions?: string): Promise<RunAgentResponse> {
    const assistantId = await this.getOrCreateAssistant(agentId);

    let run = await this.client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions,
    });

    while (run.status === 'queued' || run.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await this.client.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] = [];

      for (const toolCall of toolCalls) {
        if (toolCall.type === 'function') {
          const output = await this.handleToolCall(agentId, toolCall.function.name, JSON.parse(toolCall.function.arguments));
          toolOutputs.push({ tool_call_id: toolCall.id, output });
        }
      }

      run = await this.client.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });

      while (run.status === 'queued' || run.status === 'in_progress') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        run = await this.client.beta.threads.runs.retrieve(threadId, run.id);
      }
    }

    if (run.status === 'completed') {
      const messages = await this.client.beta.threads.messages.list(threadId, { order: 'desc', limit: 1 });
      const lastMessage = messages.data[0];
      if (lastMessage && lastMessage.role === 'assistant') {
        const content = lastMessage.content[0];
        if (content.type === 'text') {
          return { runId: run.id, status: 'completed', result: content.text.value };
        }
      }
    }

    return { runId: run.id, status: run.status as any, error: run.last_error?.message };
  }

  private async handleToolCall(agentId: string, functionName: string, args: Record<string, unknown>): Promise<string> {
    if (functionName === 'deep_search_kb') {
      const scopes = this.registry.getAgentKBScopes(agentId);
      const results = await this.deepSearch.search(args.query as string, scopes);
      return DeepSearchWrapper.formatResultsForPrompt(results);
    }
    throw new Error(`Unknown function: ${functionName}`);
  }

  async chat(agentId: string, message: string): Promise<string> {
    const { threadId } = await this.createThread();
    await this.addMessage(threadId, message);
    const response = await this.runAgent(agentId, threadId);
    if (response.status === 'completed' && response.result) return response.result;
    throw new Error(`Agent run failed: ${response.error || response.status}`);
  }

  async continueConversation(agentId: string, threadId: string, message: string): Promise<string> {
    await this.addMessage(threadId, message);
    const response = await this.runAgent(agentId, threadId);
    if (response.status === 'completed' && response.result) return response.result;
    throw new Error(`Agent run failed: ${response.error || response.status}`);
  }

  async getThreadMessages(threadId: string): Promise<OpenAI.Beta.Threads.Messages.Message[]> {
    const messages = await this.client.beta.threads.messages.list(threadId);
    return messages.data;
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.client.beta.threads.del(threadId);
  }

  async deleteAssistant(agentId: string): Promise<void> {
    const assistantId = this.assistantCache.get(agentId);
    if (assistantId) {
      await this.client.beta.assistants.del(assistantId);
      this.assistantCache.delete(agentId);
    }
  }

  clearCache(): void {
    this.assistantCache.clear();
  }
}

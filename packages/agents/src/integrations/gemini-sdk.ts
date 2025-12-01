import { GoogleGenerativeAI, FunctionDeclarationSchemaType, Tool } from '@google/generative-ai';
import { AgentRegistryLoader } from '../registry-loader';
import { DeepSearchWrapper } from '../deep-search-wrapper';

export interface GeminiAgentRuntime {
  apiKey: string;
  registry: AgentRegistryLoader;
  deepSearch: DeepSearchWrapper;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: string;
}

export class GeminiSDKIntegration {
  private genAI: GoogleGenerativeAI;
  private registry: AgentRegistryLoader;
  private deepSearch: DeepSearchWrapper;

  constructor(runtime: GeminiAgentRuntime) {
    this.genAI = new GoogleGenerativeAI(runtime.apiKey);
    this.registry = runtime.registry;
    this.deepSearch = runtime.deepSearch;
  }

  private buildTools(agentId: string): Tool[] {
    const agent = this.registry.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const tools: Tool[] = [];
    if (agent.runtime.gemini.tools.includes('deep_search_kb')) {
      const toolDef = this.registry.getTool('deep_search_kb');
      if (toolDef) {
        tools.push({
          functionDeclarations: [{
            name: toolDef.implementation.gemini.function_name,
            description: toolDef.description,
            parameters: {
              type: FunctionDeclarationSchemaType.OBJECT,
              properties: {
                query: {
                  type: FunctionDeclarationSchemaType.STRING,
                  description: 'Search query for the knowledge base',
                },
              },
              required: ['query'],
            },
          }],
        });
      }
    }
    return tools;
  }

  private getModel(agentId: string) {
    const config = this.registry.getGeminiConfig(agentId);
    const tools = this.buildTools(agentId);

    return this.genAI.getGenerativeModel({
      model: config.model,
      generationConfig: { temperature: config.temperature },
      tools: tools.length > 0 ? tools : undefined,
      systemInstruction: config.instructions,
    });
  }

  async chat(agentId: string, message: string): Promise<string> {
    const model = this.getModel(agentId);
    const result = await model.generateContent(message);
    const response = result.response;

    const functionCalls = response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const functionResults = [];

      for (const call of functionCalls) {
        const output = await this.handleFunctionCall(agentId, call.name, call.args);
        functionResults.push({
          functionResponse: { name: call.name, response: { result: output } },
        });
      }

      const secondResult = await model.generateContent([
        { text: message },
        { functionCall: functionCalls[0] },
        ...functionResults,
      ]);

      return secondResult.response.text();
    }

    return response.text();
  }

  async startChat(agentId: string, history: ChatMessage[] = []) {
    const model = this.getModel(agentId);
    const formattedHistory = history.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    }));

    const chat = model.startChat({ history: formattedHistory });

    return {
      sendMessage: async (message: string): Promise<string> => {
        const result = await chat.sendMessage(message);
        const response = result.response;

        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
          const functionResults = [];

          for (const call of functionCalls) {
            const output = await this.handleFunctionCall(agentId, call.name, call.args);
            functionResults.push({
              functionResponse: { name: call.name, response: { result: output } },
            });
          }

          const secondResult = await chat.sendMessage(functionResults);
          return secondResult.response.text();
        }

        return response.text();
      },

      getHistory: async (): Promise<ChatMessage[]> => {
        const history = await chat.getHistory();
        return history.map((msg) => ({
          role: msg.role as 'user' | 'model',
          parts: msg.parts.map((p) => (p as any).text).join(''),
        }));
      },
    };
  }

  async streamChat(agentId: string, message: string): Promise<AsyncIterable<string>> {
    const model = this.getModel(agentId);
    const result = await model.generateContentStream(message);

    async function* streamGenerator() {
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) yield chunkText;
      }
    }

    return streamGenerator();
  }

  private async handleFunctionCall(agentId: string, functionName: string, args: Record<string, unknown>): Promise<string> {
    if (functionName === 'deep_search_kb') {
      const scopes = this.registry.getAgentKBScopes(agentId);
      const results = await this.deepSearch.search(args.query as string, scopes);
      return DeepSearchWrapper.formatResultsForPrompt(results);
    }
    throw new Error(`Unknown function: ${functionName}`);
  }

  async countTokens(agentId: string, message: string): Promise<number> {
    const model = this.getModel(agentId);
    const result = await model.countTokens(message);
    return result.totalTokens;
  }

  async embedText(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: 'embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}

/* eslint-env node */

export type AgentMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type StreamHandler = (token: string) => void;

export interface ToolResponse {
  response: string;
  cost: number;
}

export abstract class Tool {
  constructor(public name: string) {}

  async run(messages: AgentMessage[], onToken?: StreamHandler): Promise<ToolResponse> {
    const text = `${this.name} response`;
    for (const token of text.split(' ')) {
      onToken?.(token + ' ');
    }
    return { response: text, cost: text.length };
  }
}

export class RAGQASubgraph extends Tool {
  constructor() {
    super('rag-qa');
  }
}

export class AccountingSubgraph extends Tool {
  constructor() {
    super('accounting');
  }
}

export class AuditSubgraph extends Tool {
  constructor() {
    super('audit');
  }
}

export class TaxSubgraph extends Tool {
  constructor() {
    super('tax');
  }
}

export class Supervisor {
  private tools: Record<string, Tool>;

  constructor() {
    this.tools = {
      'rag-qa': new RAGQASubgraph(),
      accounting: new AccountingSubgraph(),
      audit: new AuditSubgraph(),
      tax: new TaxSubgraph(),
    };
  }

  listTools(): string[] {
    return Object.keys(this.tools);
  }

  async chat(messages: AgentMessage[], onToken?: StreamHandler): Promise<ToolResponse> {
    return this.tools['rag-qa'].run(messages, onToken);
  }

  async invoke(name: string, messages: AgentMessage[], onToken?: StreamHandler): Promise<ToolResponse> {
    const tool = this.tools[name];
    if (!tool) throw new Error('Unknown tool');
    return tool.run(messages, onToken);
  }
}


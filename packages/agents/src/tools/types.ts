/**
 * Tool interfaces for agent execution
 */

export type ToolExecutionContext = {
  userId?: string;
  sessionId?: string;
  jurisdictionCode?: string;
};

export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type DeepSearchParams = {
  query: string;
  topK?: number;
  filters?: {
    category?: string;
    jurisdiction?: string;
  };
};

export type SemanticSearchParams = {
  query: string;
  topK?: number;
  categories?: string[];
};

export type KeywordSearchParams = {
  query: string;
  limit?: number;
  categories?: string[];
};

export type CalculatorParams = {
  expression: string;
  context?: {
    variables?: Record<string, number>;
  };
};

export interface Tool {
  name: string;
  description: string;
  execute(params: unknown, context?: ToolExecutionContext): Promise<ToolResult>;
}

export const semanticSupabaseFunction = {
  name: "semantic_supabase_search",
  description:
    "Performs semantic (embedding-based) search in the Supabase knowledge base. Use this for concept-based queries.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The semantic query to search for",
      },
      kb_scopes: {
        type: "array",
        items: { type: "string" },
        description: "Optional knowledge base scopes to filter by (e.g., 'tax:mt:compliance')",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 5)",
        default: 5,
      },
    },
    required: ["query"],
  },
};

export const keywordSupabaseFunction = {
  name: "keyword_supabase_search",
  description:
    "Performs keyword-based (full-text) search in the Supabase knowledge base. Use this for exact term matching.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The keyword query to search for",
      },
      kb_scopes: {
        type: "array",
        items: { type: "string" },
        description: "Optional knowledge base scopes to filter by",
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 5)",
        default: 5,
      },
    },
    required: ["query"],
  },
};

export const deepSearchFunction = {
  name: "deep_search",
  description:
    "Performs deep search across multiple knowledge sources using the DeepSearch agent. Use for comprehensive research.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The research query",
      },
      jurisdictions: {
        type: "array",
        items: { type: "string" },
        description: "Jurisdictions to focus on",
      },
    },
    required: ["query"],
  },
};

export const calculatorFunction = {
  name: "calculator",
  description:
    "Performs mathematical calculations. Use for tax computations, financial calculations, etc.",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Mathematical expression to evaluate (e.g., '1000 * 0.18')",
      },
    },
    required: ["expression"],
  },
};

export function getToolDeclarations(toolNames: string[]) {
  const toolMap: Record<string, unknown> = {
    semantic_supabase_search: semanticSupabaseFunction,
    keyword_supabase_search: keywordSupabaseFunction,
    deepsearch: deepSearchFunction,
    calculator: calculatorFunction,
  };

  return toolNames
    .map((name) => {
      const normalized = name.toLowerCase().replace(/_/g, "_");
      return toolMap[normalized] || toolMap[name];
    })
    .filter(Boolean);
}

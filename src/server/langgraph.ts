// Minimal LangGraph-style supervisor routing
// Routes tasks to specific subgraph handlers

export type SubgraphName = "rag_qa" | "autocat" | "vat" | "audit_plan";

export type SubgraphHandler = (payload: unknown) => Promise<unknown>;

const subgraphs: Record<SubgraphName, SubgraphHandler> = {
  rag_qa: async (payload) => ({ result: "rag_qa", payload }),
  autocat: async (payload) => ({ result: "autocat", payload }),
  vat: async (payload) => ({ result: "vat", payload }),
  audit_plan: async (payload) => ({ result: "audit_plan", payload }),
};

export async function runSupervisor(graph: SubgraphName, payload: unknown) {
  const handler = subgraphs[graph];
  if (!handler) {
    throw new Error(`Unknown subgraph: ${graph}`);
  }
  return handler(payload);
}

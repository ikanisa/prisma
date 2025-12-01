export type AgentRegistryEntry = {
  id: string;
  category: string;
  name: string;
  description: string;
  jurisdictions: string[];
  standards: Record<string, string[]>;
  kb_scopes: string[];
  tools: string[];
  engine_preferences: {
    primary: "openai" | "gemini";
    fallback?: "openai" | "gemini";
  };
  routing_tags: string[];
  persona?: {
    tone?: string;
    style?: string;
    do?: string[];
    dont?: string[];
  };
};

export type RegistryFile = {
  version: number;
  agents: AgentRegistryEntry[];
};

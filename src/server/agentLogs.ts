import type { Request } from "express";

export interface CostMetrics {
  tokens: number;
  cost?: number;
}

export interface AgentLog {
  route: string;
  input: unknown;
  output?: unknown;
  cost: CostMetrics;
  timestamp: number;
}

const logs: AgentLog[] = [];

export function recordAgentLog(route: string, input: unknown, output: unknown) {
  const tokens = JSON.stringify(input ?? "{}").length;
  logs.push({
    route,
    input,
    output,
    cost: { tokens },
    timestamp: Date.now(),
  });
}

export function getAgentLogs() {
  return logs;
}

export function logMiddleware(route: string) {
  return (_req: Request, _res: unknown, next: () => void) => {
    recordAgentLog(route, {}, undefined);
    next();
  };
}

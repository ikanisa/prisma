import { z } from 'zod';

// TODO: implement intent classification (Edge fn or OpenAI fallback)
export async function classifyIntent(text: string) {
  return { intent: 'UNKNOWN', domain: 'general', confidence: 0 };
}

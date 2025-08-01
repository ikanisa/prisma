import { z } from 'zod';

// Determine if a template should be used based on intent and history
export function chooseTemplate(
  intent: string,
  domain: string,
  lastOutgoingAt?: string
): string | null {
  return null;
}

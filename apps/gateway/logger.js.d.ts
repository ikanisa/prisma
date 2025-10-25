import type { Logger } from '@prisma-glow/logger';

export type LogFunction = (message: string, details?: unknown) => void;

export const logger: Logger;

export function logInfo(event: string, meta?: Record<string, unknown>): void;
export function logWarn(event: string, meta?: Record<string, unknown>): void;
export function logError(
  event: string,
  error: unknown,
  meta?: Record<string, unknown>
): void;

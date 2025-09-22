import type { ConversationContext } from "../state/types.ts";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  requestId?: string;
  userId?: string;
  phone?: string;
}

function normalizeError(error: unknown): Record<string, unknown> {
  if (!error) return { message: "unknown" };
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === "string") {
    return { message: error };
  }
  if (typeof error === "object") {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch (_err) {
      return { message: String(error) };
    }
  }
  return { message: String(error) };
}

function writeLog(level: LogLevel, event: string, data: Record<string, unknown> = {}, ctx: LogContext = {}) {
  const payload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...ctx,
    ...data,
  };

  const serialized = JSON.stringify(payload);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else if (level === "debug") {
    console.debug(serialized);
  } else {
    console.log(serialized);
  }
}

export function logInfo(event: string, data?: Record<string, unknown>, ctx?: LogContext) {
  writeLog("info", event, data ?? {}, ctx ?? {});
}

export function logWarn(event: string, data?: Record<string, unknown>, ctx?: LogContext) {
  writeLog("warn", event, data ?? {}, ctx ?? {});
}

export function logDebug(event: string, data?: Record<string, unknown>, ctx?: LogContext) {
  writeLog("debug", event, data ?? {}, ctx ?? {});
}

export function logError(event: string, error: unknown, data?: Record<string, unknown>, ctx?: LogContext) {
  const payload = { ...(data ?? {}), error: normalizeError(error) };
  writeLog("error", event, payload, ctx ?? {});
}

export function mergeContext(base: LogContext, extra?: LogContext): LogContext {
  if (!extra) return base;
  return {
    ...base,
    ...extra,
  };
}

export function ctxFromConversation(ctx: Pick<ConversationContext, "requestId" | "userId" | "phone">): LogContext {
  return {
    requestId: ctx.requestId,
    userId: ctx.userId,
    phone: ctx.phone,
  };
}

import type { LogContext } from "../utils/logger.ts";
import { logError } from "../utils/logger.ts";

export async function idempotent(
  client: any,
  waMessageId: string | null | undefined,
  logCtx?: LogContext,
): Promise<boolean> {
  if (!waMessageId) return true;
  const { error } = await client.from("wa_events").insert({
    wa_message_id: waMessageId,
  });
  if ((error as { code?: string } | null | undefined)?.code === "23505") {
    return false;
  }
  if (error) {
    logError("IDEMPOTENCY_ERROR", error, { waMessageId }, logCtx);
    return false;
  }
  return true;
}

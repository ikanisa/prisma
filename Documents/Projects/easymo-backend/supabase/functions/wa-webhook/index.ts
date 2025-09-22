import { serve } from "./deps.ts";
import { sb, WA_VERIFY_TOKEN } from "./config.ts";
import { verifySignature } from "./wa/verify.ts";
import { idempotent } from "./state/idempotency.ts";
import { ensureProfile, getState } from "./state/store.ts";
import { handleGlobalGuards } from "./router/guards.ts";
import { route } from "./router/router.ts";
import { ConversationContext } from "./state/types.ts";
import { logError, logInfo, logWarn } from "./utils/logger.ts";

function normalizePhone(raw: string | undefined): string {
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

serve(async (req: Request) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const url = new URL(req.url);
  const baseCtx = { requestId };

  logInfo("WEBHOOK_REQUEST_RECEIVED", {
    method: req.method,
    path: url.pathname,
  }, baseCtx);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    logInfo("WEBHOOK_VERIFY_ATTEMPT", {
      mode,
      hasChallenge: Boolean(challenge),
    }, baseCtx);

    if (mode === "subscribe" && challenge && token === WA_VERIFY_TOKEN) {
      logInfo("WEBHOOK_VERIFY_SUCCESS", { mode }, baseCtx);
      logInfo("WEBHOOK_RESPONSE", {
        status: 200,
        durationMs: Date.now() - startedAt,
        handledBy: "verify",
      }, baseCtx);
      return new Response(challenge, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    logWarn("WEBHOOK_VERIFY_FAILED", {
      mode,
      hasChallenge: Boolean(challenge),
    }, baseCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 403,
      durationMs: Date.now() - startedAt,
      handledBy: "verify",
    }, baseCtx);
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    logWarn("WEBHOOK_METHOD_NOT_ALLOWED", { method: req.method }, baseCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 405,
      durationMs: Date.now() - startedAt,
      handledBy: "method_not_allowed",
    }, baseCtx);
    return new Response("method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  logInfo("WEBHOOK_BODY_READ", { bytes: rawBody.length }, baseCtx);

  const verified = await verifySignature(req, rawBody, baseCtx);
  if (!verified) {
    logWarn("SIG_VERIFY_FAIL", {}, baseCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 401,
      durationMs: Date.now() - startedAt,
      handledBy: "signature",
    }, baseCtx);
    return new Response("invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    logError("WEBHOOK_JSON_PARSE_ERROR", error, {}, baseCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 400,
      durationMs: Date.now() - startedAt,
      handledBy: "parse_error",
    }, baseCtx);
    return new Response("invalid json", { status: 400 });
  }

  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) {
    logInfo("WEBHOOK_NO_MESSAGE", {}, baseCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 200,
      durationMs: Date.now() - startedAt,
      handledBy: "no_message",
    }, baseCtx);
    return new Response("no message", { status: 200 });
  }

  const messageId: string | undefined = message?.id;
  const from = normalizePhone(message.from);
  logInfo("WEBHOOK_MESSAGE_CONTEXT", {
    messageId,
    from,
    type: message?.type ?? "unknown",
  }, baseCtx);

  const isFresh = await idempotent(sb, messageId, { ...baseCtx, phone: from });
  if (!isFresh) {
    const dupCtx = { requestId, phone: from };
    logInfo("IDEMPOTENT_DUPLICATE", { messageId }, dupCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 200,
      durationMs: Date.now() - startedAt,
      handledBy: "duplicate",
    }, dupCtx);
    return new Response("duplicate", { status: 200 });
  }

  if (!from) {
    logWarn("MISSING_SENDER", { messageId }, baseCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 200,
      durationMs: Date.now() - startedAt,
      handledBy: "missing_sender",
    }, baseCtx);
    return new Response("missing sender", { status: 200 });
  }

  let profile;
  try {
    profile = await ensureProfile(from);
  } catch (error) {
    logError("PROFILE_ENSURE_FAILED", error, { phone: from }, baseCtx);
    logInfo("WEBHOOK_RESPONSE", {
      status: 500,
      durationMs: Date.now() - startedAt,
      handledBy: "profile_error",
    }, { requestId, phone: from });
    return new Response("server error", { status: 500 });
  }

  let state;
  try {
    state = await getState(profile.user_id);
  } catch (error) {
    logError("STATE_LOAD_FAILED", error, { userId: profile.user_id }, {
      requestId,
      phone: from,
      userId: profile.user_id,
    });
    logInfo("WEBHOOK_RESPONSE", {
      status: 500,
      durationMs: Date.now() - startedAt,
      handledBy: "state_error",
    }, { requestId, phone: from, userId: profile.user_id });
    return new Response("server error", { status: 500 });
  }

  const logCtx = { requestId, phone: from, userId: profile.user_id };
  const ctx: ConversationContext = {
    requestId,
    startedAt,
    userId: profile.user_id,
    phone: from,
    state,
    message,
  };

  const guarded = await handleGlobalGuards(ctx);
  if (guarded) {
    logInfo("WEBHOOK_RESPONSE", {
      status: 200,
      durationMs: Date.now() - startedAt,
      handledBy: "guard",
    }, logCtx);
    return new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const routed = await route(ctx);
  if (routed) {
    logInfo("WEBHOOK_RESPONSE", {
      status: 200,
      durationMs: Date.now() - startedAt,
      handledBy: "router",
    }, logCtx);
    return new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  logWarn("WEBHOOK_UNHANDLED", { messageId }, logCtx);
  logInfo("WEBHOOK_RESPONSE", {
    status: 200,
    durationMs: Date.now() - startedAt,
    handledBy: "default",
  }, logCtx);
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
});

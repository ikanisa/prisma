import { serve } from "./deps.ts";
import { sb, WA_VERIFY_TOKEN } from "./config.ts";
import { verifySignature } from "./wa/verify.ts";
import { idempotent } from "./state/idempotency.ts";
import { ensureProfile, getState } from "./state/store.ts";
import { handleGlobalGuards } from "./router/guards.ts";
import { route } from "./router/router.ts";
import { sendHome } from "./flows/home.ts";
import { ConversationContext } from "./state/types.ts";

function normalizePhone(raw: string | undefined): string {
  if (!raw) return "";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

serve(async (req: Request) => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && challenge && token === WA_VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFY_SUCCESS", { mode });
      return new Response(challenge, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    console.warn("WEBHOOK_VERIFY_FAILED", { mode, hasChallenge: Boolean(challenge) });
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const verified = await verifySignature(req, rawBody);
  if (!verified) {
    console.error("SIG_VERIFY_FAIL");
    return new Response("invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    console.error("JSON_PARSE_ERROR", error);
    return new Response("invalid json", { status: 400 });
  }

  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) {
    return new Response("no message", { status: 200 });
  }

  const messageId: string | undefined = message?.id;
  const isFresh = await idempotent(sb, messageId);
  if (!isFresh) {
    console.log("IDEMPOTENT_DUPLICATE", { messageId });
    return new Response("duplicate", { status: 200 });
  }

  const from = normalizePhone(message.from);
  if (!from) {
    console.warn("MISSING_SENDER", { messageId });
    return new Response("missing sender", { status: 200 });
  }

  const profile = await ensureProfile(from);
  const state = await getState(profile.user_id);

  const ctx: ConversationContext = {
    userId: profile.user_id,
    phone: from,
    state,
    message,
  };

  const guarded = await handleGlobalGuards(ctx);
  if (guarded) {
    return new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const routed = await route(ctx);
  if (routed) {
    return new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (state.key === "home") {
    await sendHome(from);
  }

  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
});

import { sb } from "../config.ts";
import { sendText } from "../wa/client.ts";
import { clearState } from "../state/store.ts";
import { sendHome } from "../flows/home.ts";
import type { ConversationContext } from "../state/types.ts";

async function markOptOut(phone: string) {
  const now = new Date().toISOString();
  const { error } = await sb.from("contacts").upsert({
    msisdn_e164: phone,
    opted_out: true,
    opted_in: false,
    opt_out_ts: now,
  }, { onConflict: "msisdn_e164" });
  if (error) {
    console.error("OPT_OUT_UPDATE_FAILED", error);
  }
}

async function markOptIn(phone: string) {
  const now = new Date().toISOString();
  const { error } = await sb.from("contacts").upsert({
    msisdn_e164: phone,
    opted_out: false,
    opted_in: true,
    opt_in_ts: now,
  }, { onConflict: "msisdn_e164" });
  if (error) {
    console.error("OPT_IN_UPDATE_FAILED", error);
  }
}

export async function handleGlobalGuards(ctx: ConversationContext): Promise<boolean> {
  const text = (ctx.message?.text?.body ?? "").trim().toLowerCase();
  const buttonId = ctx.message?.interactive?.button_reply?.id ?? "";

  if (text === "stop" || text === "unsubscribe") {
    await markOptOut(ctx.phone);
    await sendText(ctx.phone, "You are now opted out. Reply START anytime to opt back in.");
    return true;
  }

  if (text === "start") {
    await markOptIn(ctx.phone);
    await sendText(ctx.phone, "You are opted in. Reply HOME for the menu.");
    return true;
  }

  if (text === "home" || text === "menu" || buttonId === "back_home") {
    await clearState(ctx.userId);
    await sendHome(ctx.phone);
    return true;
  }

  return false;
}

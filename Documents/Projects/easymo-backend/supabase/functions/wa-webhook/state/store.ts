import { sb } from "../config.ts";
import { ChatState } from "./types.ts";

const DEFAULT_STATE: ChatState = { key: "home", data: {} };

export async function ensureProfile(phone: string) {
  const existing = await sb.from("profiles")
    .select("*")
    .eq("whatsapp_e164", phone)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const inserted = await sb.from("profiles")
    .insert({ whatsapp_e164: phone })
    .select("*")
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

export async function getState(userId: string): Promise<ChatState> {
  const res = await sb.from("chat_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();

  if (res.error) throw res.error;
  const state = res.data?.state as ChatState | null;
  if (!state) return { ...DEFAULT_STATE, data: { ...(DEFAULT_STATE.data ?? {}) } };
  return state;
}

export async function setState(userId: string, key: string, data?: unknown) {
  const payload = {
    user_id: userId,
    state: { key, data },
    updated_at: new Date().toISOString(),
  };

  const res = await sb.from("chat_state").upsert(payload, { onConflict: "user_id" });
  if (res.error) throw res.error;
}

export async function clearState(userId: string) {
  const res = await sb.from("chat_state").delete().eq("user_id", userId);
  if (res.error) throw res.error;
}

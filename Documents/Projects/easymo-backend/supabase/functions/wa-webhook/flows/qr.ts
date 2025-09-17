import { sendButtons, sendImageUrl, sendList, sendText } from "../wa/client.ts";
import { ConversationContext } from "../state/types.ts";
import { setState } from "../state/store.ts";
import { getBotDigits } from "../utils/share.ts";
import { to07FromE164 } from "../utils/phone.ts";
import { sb } from "../config.ts";
import { safeRowDesc, safeRowTitle, safeButtonTitle } from "../utils/text.ts";

interface MomoQrState {
  kind?: "number" | "code";
  value?: string;
}

function normalizeNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 9 && digits.startsWith("7")) {
    return `07${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("07")) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("2507")) {
    return `0${digits.slice(3)}`;
  }
  return null;
}

function normalizeCode(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length >= 4 && digits.length <= 9) {
    return digits;
  }
  return null;
}

function buildUssd(kind: "number" | "code", value: string, amount: number | null): string {
  if (kind === "number") {
    return `*182*1*1*${value}${amount ? `*${amount}` : ""}#`;
  }
  return `*182*8*1*${value}${amount ? `*${amount}` : ""}#`;
}

function buildTelUri(ussd: string): string {
  return `tel:${ussd.replace(/#/g, "%23")}`;
}

function buildQrUrl(text: string): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(text)}&margin=1&size=600`;
}

async function logRequest(params: {
  userId: string;
  phone: string;
  kind: "number" | "code";
  value: string;
  amount: number | null;
  ussd: string;
  tel: string;
  qr: string;
  share: string;
}) {
  try {
    await sb.from("momo_qr_requests").insert({
      user_id: params.userId,
      whatsapp_e164: params.phone,
      kind: params.kind,
      momo_value: params.value,
      amount_rwf: params.amount ?? null,
      ussd_text: params.ussd,
      tel_uri: params.tel,
      qr_url: params.qr,
      share_url: params.share,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("momo_qr_requests insert failed", err);
  }
}

const SEND_DELAY_MS = 250;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function sendQrImage(ctx: ConversationContext, qr: string, caption: string): Promise<boolean> {
  try {
    await sendImageUrl(ctx.phone, qr, caption);
    return true;
  } catch (error) {
    console.error("MOMO_QR_IMAGE_SEND_FAILED", error);
    return false;
  }
}

export async function startMomoQr(ctx: ConversationContext) {
  await sendList(ctx.phone, {
    title: "MoMo QR",
    body: "Choose how to generate your QR.",
    buttonText: "Choose",
    sectionTitle: "Options",
    rows: [
      { id: "mqr_use_wa", title: "Use this WhatsApp number" },
      { id: "mqr_enter_num", title: "Enter MoMo number" },
      { id: "mqr_enter_code", title: "Enter MoMo code" },
    ].map((row) => ({
      id: row.id,
      title: safeRowTitle(row.title),
      description: safeRowDesc(""),
    })),
  });
  await setState(ctx.userId, "momoqr_start", {});
  ctx.state = { key: "momoqr_start", data: {} };
}


async function promptAmount(ctx: ConversationContext, state: MomoQrState, label: string) {
  await sendText(ctx.phone, `Enter amount in RWF for ${label}, or tap Skip.`);
  await sendButtons(ctx.phone, "Amount options", [
    { id: "mqr_amt_skip", title: safeButtonTitle("Skip") },
    { id: "back_home", title: safeButtonTitle("Back") },
  ]);
  await setState(ctx.userId, "momoqr_await_amount", state);
  ctx.state = { key: "momoqr_await_amount", data: state };
}

async function generateAndSendMomoQR(ctx: ConversationContext, state: MomoQrState, amount: number | null) {
  const kind = state.kind ?? "number";
  const value = state.value ?? "";
  const ussd = buildUssd(kind, value, amount);
  const tel = buildTelUri(ussd);
  const qr = buildQrUrl(ussd);
  const caption = kind === "number" ? `MoMo ${value}` : `MoMo code ${value}`;

  if (!await sendQrImage(ctx, qr, caption)) {
    await sleep(SEND_DELAY_MS);
    await sendQrImage(ctx, qr, caption);
  }

  await sleep(SEND_DELAY_MS);
  await sendText(ctx.phone, `USSD: ${ussd}\nTap to dial: ${tel}\nShare: ${tel}`);
  await sleep(SEND_DELAY_MS);
  await sendButtons(ctx.phone, "Need another?", [
    { id: "mqr_again", title: safeButtonTitle("Generate another") },
    { id: "back_home", title: safeButtonTitle("Back to menu") },
  ]);

  await logRequest({
    userId: ctx.userId,
    phone: ctx.phone,
    kind,
    value,
    amount,
    ussd,
    tel,
    qr,
    share: tel,
  });

  await setState(ctx.userId, "momoqr_start", {});
  ctx.state = { key: "momoqr_start", data: {} };
}

export async function handleMomoQrList(ctx: ConversationContext, id: string) {
  if (id === "mqr_use_wa") {
    const digits = await getBotDigits();
    if (!digits) {
      await sendText(ctx.phone, "No WhatsApp number configured. Please enter a MoMo number instead.");
      await sendText(ctx.phone, "Enter the MoMo number (07…)");
      await setState(ctx.userId, "momoqr_await_number", {});
      ctx.state = { key: "momoqr_await_number", data: {} };
      return;
    }
    const number = normalizeNumber(digits) ?? digits;
    const human = to07FromE164(`+${digits}`);
    await promptAmount(ctx, { kind: "number", value: number }, human);
    return;
  }
  if (id === "mqr_enter_num") {
    await sendText(ctx.phone, "Enter the MoMo number (07…)");
    await setState(ctx.userId, "momoqr_await_number", {});
    ctx.state = { key: "momoqr_await_number", data: {} };
    return;
  }
  if (id === "mqr_enter_code") {
    await sendText(ctx.phone, "Enter the MoMo payment code (4–9 digits).");
    await setState(ctx.userId, "momoqr_await_code", {});
    ctx.state = { key: "momoqr_await_code", data: {} };
  }
}

export async function handleMomoQrButton(ctx: ConversationContext, id: string) {
  if (id === "mqr_amt_skip") {
    const current = ctx.state.data as MomoQrState | undefined;
    if (!current?.value) {
      await startMomoQr(ctx);
      return;
    }
    await generateAndSendMomoQR(ctx, current, null);
    return;
  }
  if (id === "mqr_again") {
    await startMomoQr(ctx);
  }
}

export async function handleMomoQrText(ctx: ConversationContext, text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;
  switch (ctx.state.key) {
    case "momoqr_await_number": {
      const normalized = normalizeNumber(trimmed);
      if (!normalized) {
        await sendText(ctx.phone, "Invalid number. Use format 07XXXXXXXX.");
        return true;
      }
      await promptAmount(ctx, { kind: "number", value: normalized }, normalized);
      return true;
    }
    case "momoqr_await_code": {
      const normalized = normalizeCode(trimmed);
      if (!normalized) {
        await sendText(ctx.phone, "Invalid code. Enter 4–9 digits.");
        return true;
      }
      await promptAmount(ctx, { kind: "code", value: normalized }, normalized);
      return true;
    }
    case "momoqr_await_amount": {
      if (trimmed.toLowerCase() === "skip") {
        const current = ctx.state.data as MomoQrState | undefined;
        if (!current?.value) {
          await startMomoQr(ctx);
          return true;
        }
        await generateAndSendMomoQR(ctx, current, null);
        return true;
      }
      const amount = Number.parseInt(trimmed.replace(/\D/g, ""), 10);
      if (!Number.isFinite(amount) || amount <= 0) {
        await sendText(ctx.phone, "Enter a valid amount or type SKIP.");
        return true;
      }
      const current = ctx.state.data as MomoQrState | undefined;
      if (!current?.value) {
        await startMomoQr(ctx);
        return true;
      }
      await generateAndSendMomoQR(ctx, current, amount);
      return true;
    }
    default:
      break;
  }
  return false;
}

import { sendButtons, sendImageUrl, sendList, sendText } from "../wa/client.ts";
import { safeButtonTitle, safeRowDesc, safeRowTitle } from "../utils/text.ts";
import { buildShareLink, buildShareQR } from "../utils/share.ts";
import { ctxFromConversation, logError } from "../utils/logger.ts";
import { ConversationContext } from "../state/types.ts";

const MENU_ROWS = [
  { id: "see_drivers", title: "Nearby Drivers" },
  { id: "see_passengers", title: "Nearby Passengers" },
  { id: "schedule_trip", title: "Schedule Trip" },
  { id: "marketplace", title: "Marketplace" },
  { id: "baskets", title: "Baskets" },
  { id: "motor_insurance", title: "Motor Insurance" },
  { id: "momoqr_start", title: "MoMo QR" },
];

const SHARE_BUTTONS = [
  { id: "share_link", title: safeButtonTitle("Share link") },
  { id: "share_qr", title: safeButtonTitle("Share QR") },
];

export const HOME_MENU_IDS = MENU_ROWS.map((row) => row.id);

export async function sendHome(ctx: ConversationContext) {
  const logCtx = ctxFromConversation(ctx);
  await sendList(ctx.phone, {
    title: "easyMO",
    body: "What would you like to do?",
    buttonText: "Open Menu",
    sectionTitle: "Main Menu",
    rows: MENU_ROWS.map((row) => ({
      id: row.id,
      title: safeRowTitle(row.title),
      description: safeRowDesc(""),
    })),
  }, logCtx);

  await sendButtons(
    ctx.phone,
    "Love easyMO??? Share it!",
    SHARE_BUTTONS,
    logCtx,
  );
}

export async function handleShareButton(ctx: ConversationContext, id: string) {
  const logCtx = ctxFromConversation(ctx);
  const link = await buildShareLink();
  if (id === "share_link") {
    await sendText(ctx.phone, `Share easyMO with friends:\n${link}`, logCtx);
    return;
  }
  if (id === "share_qr") {
    const qr = await buildShareQR(link);
    if (qr) {
      try {
        await sendImageUrl(ctx.phone, qr, "Scan to share easyMO", logCtx);
      } catch (error) {
        logError("SHARE_QR_SEND_FAILED", error, {}, logCtx);
      }
    }
    await sendText(ctx.phone, `Share easyMO with friends:\n${link}`, logCtx);
  }
}

export async function handleHomeSelection(
  ctx: ConversationContext,
  id: string,
) {
  await sendText(
    ctx.phone,
    "Thanks for your interest! We'll keep you posted.",
    ctxFromConversation(ctx),
  );
}

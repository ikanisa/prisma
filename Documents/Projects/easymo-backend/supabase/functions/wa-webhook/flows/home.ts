import { sendButtons, sendImageUrl, sendList, sendText } from "../wa/client.ts";
import { safeButtonTitle, safeRowDesc, safeRowTitle } from "../utils/text.ts";
import { buildShareLink, buildShareQR } from "../utils/share.ts";

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

export async function sendHome(to: string) {
  await sendList(to, {
    title: "easyMO",
    body: "What would you like to do?",
    buttonText: "Open Menu",
    sectionTitle: "Main Menu",
    rows: MENU_ROWS.map((row) => ({
      id: row.id,
      title: safeRowTitle(row.title),
      description: safeRowDesc(""),
    })),
  });

  await sendButtons(to, "Love easyMO??? Share it!", SHARE_BUTTONS);
}

export async function handleShareButton(to: string, id: string) {
  const link = await buildShareLink();
  if (id === "share_link") {
    await sendText(to, `Share easyMO with friends:\n${link}`);
    return;
  }
  if (id === "share_qr") {
    const qr = await buildShareQR(link);
    if (qr) {
      try {
        await sendImageUrl(to, qr, "Scan to share easyMO");
      } catch (error) {
        console.error("SHARE_QR_SEND_FAILED", error);
      }
    }
    await sendText(to, `Share easyMO with friends:\n${link}`);
  }
}

export async function handleHomeSelection(to: string, id: string) {
  await sendText(to, `Coming soon: ${id}`);
}

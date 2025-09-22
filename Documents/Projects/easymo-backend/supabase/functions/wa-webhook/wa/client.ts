import { WA_PHONE_ID, WA_TOKEN } from "../config.ts";
import { logError } from "../utils/logger.ts";
import type { LogContext } from "../utils/logger.ts";

const WA_BASE = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}`;

async function waSend(path: string, payload: unknown, logCtx?: LogContext) {
  const response = await fetch(`${WA_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    logError("WHATSAPP_SEND_FAILED", new Error(`WhatsApp send failed: ${response.status}`), {
      path,
      status: response.status,
      response: text,
    }, logCtx);
    throw new Error(`WhatsApp send failed: ${response.status} ${text}`);
  }

  return response.json();
}

type Button = { id: string; title: string };
type ListRow = { id: string; title: string; description?: string };
type ListOptions = {
  title: string;
  body: string;
  buttonText: string;
  sectionTitle?: string;
  rows: ListRow[];
};

async function sendText(to: string, body: string, logCtx?: LogContext) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  }, logCtx);
}

async function sendButtons(to: string, body: string, buttons: Button[], logCtx?: LogContext) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((button) => ({
          type: "reply",
          reply: {
            id: button.id,
            title: button.title,
          },
        })),
      },
    },
  }, logCtx);
}

async function sendList(to: string, options: ListOptions, logCtx?: LogContext) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: options.title,
      },
      body: {
        text: options.body,
      },
      action: {
        button: options.buttonText,
        sections: [
          {
            title: options.sectionTitle ?? "Options",
            rows: options.rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: row.title,
              description: row.description ?? "",
            })),
          },
        ],
      },
    },
  }, logCtx);
}

async function sendImageUrl(to: string, link: string, caption?: string, logCtx?: LogContext) {
  return waSend("messages", {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: {
      link,
      caption,
    },
  }, logCtx);
}

export { sendButtons, sendImageUrl, sendList, sendText, waSend };

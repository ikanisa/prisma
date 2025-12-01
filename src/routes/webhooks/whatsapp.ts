import type { Request, Response } from 'express';
import { runAgent } from '../../agents/agentRegistry';

function extractWhatsAppText(req: Request): string {
  if (req.body.Body) return req.body.Body;
  if (req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body) return req.body.entry[0].changes[0].value.messages[0].text.body;
  throw new Error('Unable to extract message from WhatsApp payload');
}

function extractSenderPhone(req: Request): string {
  if (req.body.From) return req.body.From.replace('whatsapp:', '');
  if (req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from) return req.body.entry[0].changes[0].value.messages[0].from;
  throw new Error('Unable to extract sender phone from WhatsApp payload');
}

async function sendWhatsAppReply(to: string, message: string): Promise<void> {
  console.log(`[WhatsApp] Sending to ${to}: ${message}`);
}

export async function handleTaxRwandaWebhook(req: Request, res: Response) {
  try {
    const userMessage = extractWhatsAppText(req);
    const senderPhone = extractSenderPhone(req);
    const { text } = await runAgent('tax-corp-rw-027', userMessage);
    await sendWhatsAppReply(senderPhone, text);
    return res.sendStatus(200);
  } catch (error: any) {
    console.error('Error in tax-corp-rw agent:', error);
    return res.sendStatus(500);
  }
}

export async function handleTaxMaltaWebhook(req: Request, res: Response) {
  try {
    const userMessage = extractWhatsAppText(req);
    const senderPhone = extractSenderPhone(req);
    const { text } = await runAgent('tax-corp-mt-028', userMessage);
    await sendWhatsAppReply(senderPhone, text);
    return res.sendStatus(200);
  } catch (error: any) {
    console.error('Error in tax-corp-mt agent:', error);
    return res.sendStatus(500);
  }
}

export function verifyWebhook(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'your_verify_token';
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

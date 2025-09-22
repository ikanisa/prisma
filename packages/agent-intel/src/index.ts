export * from './classifier';
export * from './template-chooser';
export * from './button-resolver';
export * from './formatter';
export * from './policy';
export interface InboundEvent {
  wa_id: string;
  from: string;
  text?: string;
  payload?: string;
  media?: string;
}

export interface OutboundMessage {
  type: 'text' | 'template';
  text?: string;
  templateId?: string;
  variables?: Record<string, any>;
  buttons?: ReplyButton[];
}

/**
 * Main entry: process an inbound WA event and return a formatted reply.
 */
export async function handleInbound(
  event: InboundEvent
): Promise<OutboundMessage> {
  // TODO: implement full decision logic (classifier, chooser, formatter)
  const replyText = `Agent-intel received: ${event.text ?? ''}`;
  return { type: 'text', text: replyText };
}

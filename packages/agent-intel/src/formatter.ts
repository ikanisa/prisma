import type { ReplyButton } from '@easyMO/wa-utils';

export type Payload =
  | { type: 'template'; id: string; variables?: Record<string, any> }
  | { type: 'text_buttons'; text: string; buttons: ReplyButton[] };

export function formatResponse(payload: Payload) {
  return payload;
}

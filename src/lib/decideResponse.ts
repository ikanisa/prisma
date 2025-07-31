import { TPL } from '../../supabase/functions/_shared/templates';
import { RESPONSE_POLICY as cfg } from '@/config/responsePolicy';
import { fetchButtons } from '@/lib/fetchButtons';

interface DecideOpts {
  waId: string;
  domain: string;
  intent: string;
  confidence: number;
  lastMsgAt: Date | null;
  variables?: Record<string, string>;
  language?: string;
}

export async function decideResponse(opts: DecideOpts) {
  const now = Date.now();
  const ageMs = opts.lastMsgAt ? now - opts.lastMsgAt.getTime() : Infinity;
  const outside24h = ageMs > cfg.sessionWindowMinutes * 60 * 1000;

  /* 1. Low‑confidence → clarifier */
  if (opts.confidence < cfg.clarifyThreshold) {
    return {
      type: 'clarify',
      text: 'I want to help, could you pick one option below?',
      buttons: await fetchButtons('core', 3)   // Pay · Ride · Menu
    };
  }

  /* 2. Use template if outside 24 h AND template exists */
  const templateKey = Object.entries(TPL).find(
    ([, name]) => (name as string).includes(opts.domain.replace(/_.*/,''))
  )?.[1];

  if (outside24h && templateKey) {
    return { type: 'template', name: templateKey, variables: opts.variables };
  }

  /* 3. Inside 24 h OR no template → dynamic interactive buttons */
  const dynButtons = await fetchButtons(opts.domain, 10);
  if (dynButtons.length) {
    return { type: 'interactive', text: null, buttons: dynButtons };
  }

  /* 4. Fallback plain text */
  return { type: 'plain', text: '✅ Done.' };
}
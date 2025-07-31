import { TPL } from './templates.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESPONSE_POLICY = {
  sessionWindowMinutes: 24 * 60,
  clarifyThreshold: 0.4,
  templateDomains: [
    'payments', 'mobility_driver', 'mobility_pass',
    'ordering', 'partner', 'support', 'profile',
    'marketing', 'listings_prop', 'listings_veh'
  ],
  plainDomains: ['core', 'dev', 'qa']
};

interface DecideOpts {
  waId: string;
  domain: string;
  intent: string;
  confidence: number;
  lastMsgAt: Date | null;
  variables?: Record<string, string>;
  language?: string;
}

async function fetchButtons(domain: string, limit: number = 10) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);
  
  const { data } = await sb
    .from('action_buttons')
    .select('label,payload')
    .eq('domain', domain)
    .limit(limit);
  return data ?? [];
}

export async function decideResponse(opts: DecideOpts) {
  const now = Date.now();
  const ageMs = opts.lastMsgAt ? now - opts.lastMsgAt.getTime() : Infinity;
  const outside24h = ageMs > RESPONSE_POLICY.sessionWindowMinutes * 60 * 1000;

  /* 1. Low‑confidence → clarifier */
  if (opts.confidence < RESPONSE_POLICY.clarifyThreshold) {
    return {
      type: 'clarify',
      text: 'I want to help, could you pick one option below?',
      buttons: await fetchButtons('core', 3)
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
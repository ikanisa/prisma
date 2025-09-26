export interface ProcedureSummary {
  id: string;
  title?: string | null;
  objective?: string | null;
}

const SYNONYMS: Record<string, string[]> = {
  bank: ['bank', 'cash'],
  cash: ['cash', 'bank'],
  recon: ['recon', 'reconciliation'],
  reconciliation: ['reconciliation', 'recon'],
  confirmation: ['confirmation', 'confirm', 'confirmations'],
  confirm: ['confirm', 'confirmation', 'confirmations'],
  contract: ['contract', 'agreement'],
  agreement: ['agreement', 'contract'],
  review: ['review', 'walkthrough', 'assessment'],
  walkthrough: ['walkthrough', 'review'],
  cutoff: ['cutoff', 'cut-off', 'cut'],
  'cut-off': ['cutoff', 'cut-off', 'cut'],
  cut: ['cut', 'cutoff', 'cut-off'],
  invoice: ['invoice', 'billing'],
  billing: ['billing', 'invoice'],
};

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const tokenise = (value: string) => normalise(value).split(' ').filter(Boolean);

const expandToken = (token: string) => {
  const base = token.replace(/[^a-z0-9]/g, '');
  const expansions = SYNONYMS[base] ?? [];
  return Array.from(new Set([token, base, ...expansions]));
};

const scoreProcedure = (procedure: ProcedureSummary, hintTokens: string[]) => {
  const titleTokens = tokenise(procedure.title ?? '');
  const objectiveTokens = tokenise(procedure.objective ?? '');
  const procedureTokens = new Set([...titleTokens, ...objectiveTokens]);

  let score = 0;
  for (const token of hintTokens) {
    if (!token) continue;
    const expansions = expandToken(token);
    const matched = expansions.some((candidate) => {
      if (!candidate) return false;
      for (const procToken of procedureTokens) {
        if (procToken.includes(candidate) || candidate.includes(procToken)) {
          return true;
        }
      }
      return false;
    });
    if (matched) score += 1;
  }
  return score;
};

export function matchProcedureId(procedures: ProcedureSummary[], hint?: string | null): string | null {
  if (!hint) return null;
  const hintTokens = tokenise(hint);
  if (hintTokens.length === 0) return null;

  // First try direct substring matches for stronger signals.
  const normalisedHint = hintTokens.join(' ');
  const direct = procedures.find((procedure) => normalise(procedure.title ?? '').includes(normalisedHint));
  if (direct) return direct.id;

  let best: { id: string; score: number } | null = null;
  for (const procedure of procedures) {
    const score = scoreProcedure(procedure, hintTokens);
    if (score === 0) continue;
    if (!best || score > best.score) {
      best = { id: procedure.id, score };
    }
  }

  return best?.id ?? null;
}

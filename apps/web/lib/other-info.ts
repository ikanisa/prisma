export const FLAG_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export const FLAG_STATUSES = ['open', 'in_review', 'resolved'] as const;
export const FLAG_CATEGORIES = [
  'Narrative consistency',
  'Financial figures',
  'Regulatory references',
  'Presentation & labelling',
  'Other disclosure',
] as const;

export const COMPARATIVE_STATUSES = ['pending', 'in_progress', 'completed', 'waived'] as const;

export const DEFAULT_COMPARATIVE_CHECKS = [
  {
    key: 'narrative_alignment',
    assertion:
      'Narrative sections describing the business, strategy, and risks agree with the audited financial statements and ISA 720 requirements.',
  },
  {
    key: 'financial_highlights',
    assertion: 'Financial highlights and key metrics disclosed in other information agree to the audited figures.',
  },
  {
    key: 'prior_period_balances',
    assertion: 'Prior year comparative balances reconcile to the prior audited financial statements (ISA 710).',
  },
  {
    key: 'non_gaap_measures',
    assertion: 'Non-GAAP or alternative performance measures are clearly reconciled and consistent with audited results.',
  },
  {
    key: 'subsequent_events_alignment',
    assertion: 'Subsequent events and regulatory announcements referenced in other information align with auditor knowledge.',
  },
] as const;

export type FlagSeverity = (typeof FLAG_SEVERITIES)[number];
export type FlagStatus = (typeof FLAG_STATUSES)[number];
export type ComparativeStatus = (typeof COMPARATIVE_STATUSES)[number];

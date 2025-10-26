export interface TcwgTemplateParams {
  scopeSummary?: string | null;
  independenceStatement?: string | null;
  significantFindings?: string | null;
  significantDifficulties?: string | null;
  uncorrected: Array<Record<string, unknown>>;
  corrected: Array<Record<string, unknown>>;
  deficiencies: Array<Record<string, unknown>>;
  kamSummary: Array<Record<string, unknown>>;
  goingConcern: Record<string, unknown>;
  subsequentEvents: Record<string, unknown>;
  otherMatters?: string | null;
}

export function summariseMisstatements(items: Array<Record<string, unknown>>) {
  if (!items.length) return '[]';
  return JSON.stringify(items, null, 2);
}

function toPlain(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function stringifyOrDefault(value: unknown, fallback: string) {
  if (!value) return fallback;
  if (typeof value === 'string') return value || fallback;
  return JSON.stringify(value, null, 2);
}

export function buildTcwgMarkdown(template: string, params: TcwgTemplateParams) {
  const gcSummaryText = stringifyOrDefault(params.goingConcern, 'No material uncertainties identified.');
  const seSummaryText = stringifyOrDefault(params.subsequentEvents, 'No significant subsequent events noted.');

  return template
    .replace('{{ scope_summary }}', params.scopeSummary ?? '')
    .replace('{{ independence_statement }}', params.independenceStatement ?? '')
    .replace(
      '{{ significant_findings }}',
      params.significantFindings ?? 'No significant findings beyond those already discussed.',
    )
    .replace('{{ significant_difficulties }}', params.significantDifficulties ?? 'No significant difficulties encountered.')
    .replace('{{ going_concern_summary_text }}', gcSummaryText)
    .replace('{{ subsequent_events_summary_text }}', seSummaryText)
    .replace('{{ other_matters }}', params.otherMatters ?? 'None.')
    .replace('{{ annex_uncorrected }}', summariseMisstatements(params.uncorrected))
    .replace('{{ annex_corrected }}', summariseMisstatements(params.corrected))
    .replace('{{ annex_kams }}', JSON.stringify(params.kamSummary.map((k) => toPlain(k)), null, 2))
    .replace('{{ annex_deficiencies }}', JSON.stringify(params.deficiencies.map((d) => toPlain(d)), null, 2))
    .replace(
      '{{ annex_gc_se }}',
      JSON.stringify({ goingConcern: params.goingConcern, subsequentEvents: params.subsequentEvents }, null, 2),
    );
}

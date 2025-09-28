import { describe, expect, it } from 'vitest';
import { buildTcwgMarkdown, summariseMisstatements } from '@/utils/tcwg-pack';

const template = `Scope: {{ scope_summary }}\nIndependence: {{ independence_statement }}\nAnnexA:\n{{ annex_uncorrected }}`;

describe('tcwg-pack utils', () => {
  it('summarises misstatements as JSON', () => {
    const json = summariseMisstatements([{ id: 'm1', amount: 1000 }]);
    expect(json).toContain('"id"');
  });

  it('renders template placeholders', () => {
    const markdown = buildTcwgMarkdown(template, {
      scopeSummary: 'Group audit with component A',
      independenceStatement: 'We remain independent.',
      significantFindings: null,
      significantDifficulties: null,
      uncorrected: [],
      corrected: [],
      deficiencies: [],
      kamSummary: [],
      goingConcern: {},
      subsequentEvents: {},
      otherMatters: null,
    });
    expect(markdown).toContain('Group audit');
    expect(markdown).toContain('We remain independent.');
    expect(markdown).toContain('[]');
  });
});

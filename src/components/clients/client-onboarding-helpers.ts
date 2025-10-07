export interface ClientDraft {
  name?: string;
  industry?: string;
  country?: string;
  fiscalYearEnd?: string;
  contactName?: string;
  contactEmail?: string;
}

export const REQUIRED_FIELDS: Array<keyof ClientDraft> = [
  'name',
  'industry',
  'country',
  'fiscalYearEnd',
  'contactName',
  'contactEmail',
];

export const FIELD_LABELS: Record<keyof ClientDraft, string> = {
  name: 'Company name',
  industry: 'Industry',
  country: 'Country',
  fiscalYearEnd: 'Fiscal year end',
  contactName: 'Primary contact name',
  contactEmail: 'Primary contact email',
};

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const DATE_REGEX = /\b(19|20)\d{2}[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/;

const trimValue = (value?: string) => value?.trim() || undefined;

export function extractClientFieldsFromText(text: string): ClientDraft {
  const draft: ClientDraft = {};
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const joined = text.replace(/\s+/g, ' ');

  const assignIfPresent = (key: keyof ClientDraft, value?: string) => {
    if (!value) return;
    const trimmed = value.replace(/^["']|["']$/g, '').trim();
    if (!trimmed) return;
    if (!draft[key]) {
      draft[key] = trimmed;
    }
  };

  const linePatterns: Array<[keyof ClientDraft, RegExp[]]> = [
    ['name', [/(?:company|client) name[:-]\s*(.+)/i]],
    ['industry', [/industry[:-]\s*(.+)/i]],
    ['country', [/country[:-]\s*(.+)/i]],
    ['contactName', [/contact name[:-]\s*(.+)/i, /primary contact[:-]\s*(.+)/i]],
  ];

  linePatterns.forEach(([key, regexes]) => {
    regexes.forEach((regex) => {
      lines.forEach((line) => {
        const match = line.match(regex);
        if (match && match[1]) {
          assignIfPresent(key, match[1]);
        }
      });
    });
  });

  const narrativePatterns: Array<[keyof ClientDraft, RegExp[]]> = [
    ['name', [/name is ([^.\n]+?)(?: and|,|\.|$)/i]],
    ['industry', [/operates in (?:the )?([^.\n,]+)(?: industry| sector)?/i]],
    ['country', [/based in ([^.\n,]+?)(?: and|,|\.|$)/i]],
    ['contactName', [/contact is ([^.\n,]+?)(?:\(| and|,|\.|$)/i]],
  ];

  narrativePatterns.forEach(([key, regexes]) => {
    if (draft[key]) return;
    regexes.forEach((regex) => {
      const match = joined.match(regex);
      if (match && match[1]) {
        assignIfPresent(key, match[1]);
      }
    });
  });

  if (!draft.contactEmail) {
    const emailMatch = joined.match(EMAIL_REGEX);
    if (emailMatch) {
      assignIfPresent('contactEmail', emailMatch[0]);
    }
  }

  if (!draft.fiscalYearEnd) {
    const fyeLine = lines.find((line) => /fiscal (year|yr) end|fye/i.test(line));
    if (fyeLine) {
      const dateMatch = fyeLine.match(DATE_REGEX);
      assignIfPresent('fiscalYearEnd', dateMatch?.[0]);
    }
  }

  if (!draft.fiscalYearEnd) {
    const dateMatch = joined.match(DATE_REGEX);
    assignIfPresent('fiscalYearEnd', dateMatch?.[0]);
  }

  return draft;
}

export function extractClientFieldsFromJson(data: Record<string, unknown>): ClientDraft {
  const draft: ClientDraft = {};
  const map: Array<[keyof ClientDraft, string[]]> = [
    ['name', ['name', 'companyName', 'clientName']],
    ['industry', ['industry', 'sector']],
    ['country', ['country', 'jurisdiction']],
    ['fiscalYearEnd', ['fiscalYearEnd', 'fye', 'yearEnd']],
    ['contactName', ['contactName', 'primaryContact', 'contact']],
    ['contactEmail', ['contactEmail', 'primaryEmail', 'email']],
  ];

  map.forEach(([key, candidates]) => {
    for (const candidate of candidates) {
      const value = data[candidate];
      if (typeof value === 'string') {
        const trimmed = trimValue(value);
        if (trimmed) {
          draft[key] = trimmed;
          break;
        }
      }
    }
  });

  if (!draft.contactEmail && typeof data === 'object' && data) {
    const values = Object.values(data);
    const email = values.find((value) => typeof value === 'string' && EMAIL_REGEX.test(value));
    if (typeof email === 'string') {
      draft.contactEmail = email;
    }
  }

  return draft;
}

export function mergeDraft(base: ClientDraft, updates: ClientDraft): { next: ClientDraft; changed: Array<keyof ClientDraft> } {
  const next: ClientDraft = { ...base };
  const changed: Array<keyof ClientDraft> = [];
  REQUIRED_FIELDS.forEach((field) => {
    const candidate = updates[field];
    if (!candidate) return;
    if (!next[field] || next[field] !== candidate) {
      next[field] = candidate;
      changed.push(field);
    }
  });
  return { next, changed };
}

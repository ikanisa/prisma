import { describe, expect, it } from 'vitest';
import {
  extractClientFieldsFromJson,
  extractClientFieldsFromText,
  mergeDraft,
} from '@/components/clients/client-onboarding-helpers';

describe('client onboarding field extraction', () => {
  it('extracts fields from structured text', () => {
    const sample = `Company Name: Lumina Labs\nIndustry: Technology\nCountry: Germany\nFiscal Year End: 2024-12-31\nContact Name: Maria Schultz\nContact Email: maria@luminalabs.eu`;
    const draft = extractClientFieldsFromText(sample);
    expect(draft).toMatchObject({
      name: 'Lumina Labs',
      industry: 'Technology',
      country: 'Germany',
      fiscalYearEnd: '2024-12-31',
      contactName: 'Maria Schultz',
      contactEmail: 'maria@luminalabs.eu',
    });
  });

  it('extracts fields from narrative text', () => {
    const sample = 'The client name is Aurora Ventures and it operates in the renewable energy industry. They are based in Spain and their fiscal year end is 2025-03-31. Primary contact is Javier Ortiz (javier@auroraventures.es).';
    const draft = extractClientFieldsFromText(sample);
    expect(draft.name).toBe('Aurora Ventures');
    expect(draft.industry?.toLowerCase()).toContain('renewable energy');
    expect(draft.country).toBe('Spain');
    expect(draft.fiscalYearEnd).toBe('2025-03-31');
    expect(draft.contactName).toBe('Javier Ortiz');
    expect(draft.contactEmail).toBe('javier@auroraventures.es');
  });

  it('extracts fields from json-like payloads', () => {
    const draft = extractClientFieldsFromJson({
      companyName: 'Atlas Robotics',
      sector: 'Industrial automation',
      country: 'United States',
      yearEnd: '2024-09-30',
      primaryContact: 'Dana Lee',
      primaryEmail: 'dana@atlasrobotics.com',
    });
    expect(draft).toMatchObject({
      name: 'Atlas Robotics',
      industry: 'Industrial automation',
      country: 'United States',
      fiscalYearEnd: '2024-09-30',
      contactName: 'Dana Lee',
      contactEmail: 'dana@atlasrobotics.com',
    });
  });

  it('merges draft updates, preserving previously captured data', () => {
    const base = {
      name: 'Northwind Traders',
      industry: 'Retail',
      country: 'United Kingdom',
    };
    const updates = {
      industry: 'Consumer retail',
      contactEmail: 'hello@northwind.co.uk',
    };
    const { next, changed } = mergeDraft(base, updates);
    expect(next).toMatchObject({
      name: 'Northwind Traders',
      industry: 'Consumer retail',
      country: 'United Kingdom',
      contactEmail: 'hello@northwind.co.uk',
    });
    expect(changed).toContain('industry');
    expect(changed).toContain('contactEmail');
  });
});

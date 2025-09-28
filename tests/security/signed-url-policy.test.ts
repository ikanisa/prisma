import { afterEach, describe, expect, it } from 'vitest';

import { getSignedUrlTTL, sanitizeMetadata } from '../../lib/security/signed-url-policy';

describe('getSignedUrlTTL', () => {
  afterEach(() => {
    delete process.env.SIGNED_URL_EVIDENCE_TTL_SECONDS;
    delete process.env.SIGNED_URL_DEFAULT_TTL_SECONDS;
    delete process.env.DOCUMENT_SIGN_TTL;
  });

  it('returns the evidence specific override when present', () => {
    process.env.SIGNED_URL_EVIDENCE_TTL_SECONDS = '180';
    expect(getSignedUrlTTL('evidence')).toBe(180);
  });

  it('falls back to the default override and enforces minimum', () => {
    process.env.SIGNED_URL_DEFAULT_TTL_SECONDS = '30'; // below minimum
    expect(getSignedUrlTTL('document')).toBeGreaterThanOrEqual(60);
  });

  it('falls back to legacy DOCUMENT_SIGN_TTL', () => {
    process.env.DOCUMENT_SIGN_TTL = '240';
    expect(getSignedUrlTTL()).toBe(240);
  });

  it('returns the baked-in default when no env vars are set', () => {
    expect(getSignedUrlTTL('evidence')).toBe(300);
  });
});

describe('sanitizeMetadata', () => {
  it('redacts sensitive keys and patterns', () => {
    const metadata = {
      clientEmail: 'client@example.com',
      reviewer_phone: '+356 99 123 456',
      attachment: {
        notes: 'Contains SSN 123-45-6789',
      },
      benign: 'ok',
    };

    const sanitized = sanitizeMetadata(metadata);

    expect(sanitized.clientEmail).toBe('[REDACTED]');
    expect(sanitized.reviewer_phone).toBe('[REDACTED]');
    expect(sanitized.attachment.notes).toBe('[REDACTED]');
    expect(sanitized.benign).toBe('ok');
  });

  it('returns primitives untouched', () => {
    expect(sanitizeMetadata('value')).toBe('value');
    expect(sanitizeMetadata(123)).toBe(123);
  });
});

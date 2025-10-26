import { describe, expect, it, afterEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { attachRequestId, getOrCreateRequestId, jsonWithRequestId } from '../../../../../apps/web/app/lib/observability';

describe('observability helpers', () => {
  let randomSpy: ReturnType<typeof vi.spyOn> | undefined;

  afterEach(() => {
    randomSpy?.mockRestore();
    randomSpy = undefined;
  });

  describe('getOrCreateRequestId', () => {
    it('returns an existing request id header when present', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'x-request-id': 'req-123',
        },
      });

      expect(getOrCreateRequestId(request)).toBe('req-123');
    });

    it('falls back to the correlation id header when request id is missing', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'x-correlation-id': 'corr-456',
        },
      });

      expect(getOrCreateRequestId(request)).toBe('corr-456');
    });

    it('uses crypto.randomUUID when available', () => {
      randomSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-generated');
      const request = new Request('https://example.com/test');

      expect(getOrCreateRequestId(request)).toBe('uuid-generated');
      expect(randomSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back to Math.random when crypto.randomUUID throws', () => {
      randomSpy = vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
        throw new Error('no entropy');
      });
      const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const request = new Request('https://example.com/test');

      const result = getOrCreateRequestId(request);
      expect(result.startsWith('req_')).toBe(true);
      const expectedSuffix = (0.5).toString(36).slice(2, 10);
      expect(result).toBe(`req_${expectedSuffix}`);

      mathSpy.mockRestore();
    });
  });

  describe('jsonWithRequestId', () => {
    it('attaches the request id header to a JSON response', async () => {
      const response = jsonWithRequestId({ ok: true }, { status: 201 }, 'req-xyz');
      expect(response.headers.get('x-request-id')).toBe('req-xyz');
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.status).toBe(201);
    });
  });

  describe('attachRequestId', () => {
    it('preserves existing headers and adds the request id', () => {
      const init = { headers: { 'content-type': 'application/json' } } satisfies ResponseInit;
      const result = attachRequestId(init, 'req-abc');
      const headers = new Headers(result.headers);

      expect(headers.get('content-type')).toBe('application/json');
      expect(headers.get('x-request-id')).toBe('req-abc');
    });
  });
});

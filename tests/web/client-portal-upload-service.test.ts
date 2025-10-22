import { describe, expect, it, vi } from 'vitest';

import { resolveUploadEndpoint, submitDocument } from '../../apps/web/app/client-portal/upload-service';

describe('client portal upload service', () => {
  it('normalises the upload endpoint for relative paths', () => {
    expect(resolveUploadEndpoint('')).toBe('/client/upload');
    expect(resolveUploadEndpoint('https://api.example.com/')).toBe('https://api.example.com/client/upload');
    expect(resolveUploadEndpoint(' https://api.example.com ')).toBe('https://api.example.com/client/upload');
  });

  it('submits a document and resolves based on the response code', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    const file = new File(['hello'], 'evidence.pdf', { type: 'application/pdf' });

    const success = await submitDocument({ apiBase: 'https://api.example.com', fetchImpl: mockFetch }, file);
    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/client/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );

    mockFetch.mockResolvedValueOnce({ ok: false });
    const failure = await submitDocument({ apiBase: '', fetchImpl: mockFetch }, file);
    expect(failure).toBe(false);
    expect(mockFetch).toHaveBeenLastCalledWith(
      '/client/upload',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
  });
});

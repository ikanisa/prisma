import { describe, expect, it, vi, beforeAll } from 'vitest';

// Set environment for tests
process.env.WHATSAPP_VERIFY_TOKEN = 'verify123';

import { handler } from '../functions/whatsapp-webhook';

describe('whatsapp-webhook handler', () => {
  it('verifies webhook GET challenge', async () => {
    const url = `https://test.local?hub.mode=subscribe&hub.verify_token=verify123&hub.challenge=XYZ`;
    const res = await handler(new Request(url, { method: 'GET' }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('XYZ');
  });

  it('rejects invalid token', async () => {
    const url = `https://test.local?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=XYZ`;
    const res = await handler(new Request(url, { method: 'GET' }));
    expect(res.status).toBe(403);
  });
});

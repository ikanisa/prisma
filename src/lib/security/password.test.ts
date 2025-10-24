import { describe, expect, it, vi, afterEach } from 'vitest';
import { isPasswordBreached, isPasswordBreachCheckEnabled } from './password';

const ORIGINAL_FETCH = global.fetch;

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('isPasswordBreached', () => {
  it('returns true when the password hash count meets the threshold', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => '1E4C9B93F3F0682250B6CF8331B7EE68FD8:42\n',
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const breached = await isPasswordBreached('password', 10);

    expect(breached).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    expect(init?.headers).toMatchObject({
      'Add-Padding': 'true',
      'User-Agent': expect.stringContaining('prisma-glow-password-check'),
    });
  });

  it('returns false when the password hash is not present or below threshold', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () => 'ABCDEF0123456789ABCDEF0123456789ABCDEF01:1\n',
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    const breached = await isPasswordBreached('password', 100);

    expect(breached).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('throws when the HaveIBeenPwned API returns a failure response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      text: async () => '',
    })) as unknown as typeof fetch;
    global.fetch = fetchMock;

    await expect(isPasswordBreached('password')).rejects.toThrow('hibp_request_failed_503');
  });
});

describe('isPasswordBreachCheckEnabled', () => {
  it('reflects the VITE_ENABLE_PWNED_PASSWORD_CHECK flag', () => {
    vi.stubEnv('VITE_ENABLE_PWNED_PASSWORD_CHECK', 'true');
    expect(isPasswordBreachCheckEnabled()).toBe(true);

    vi.stubEnv('VITE_ENABLE_PWNED_PASSWORD_CHECK', '0');
    expect(isPasswordBreachCheckEnabled()).toBe(false);
  });
});

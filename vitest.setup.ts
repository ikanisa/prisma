import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('google-auth-library', () => ({
  __esModule: true,
  JWT: class JWTStub {
    constructor(public options: Record<string, unknown> = {}) {}

    async authorize() {
      return {
        access_token: 'stub-token',
        token_type: 'Bearer',
        expiry_date: Date.now() + 60_000,
        scopes: Array.isArray(this.options?.scopes)
          ? [...(this.options!.scopes as string[])]
          : [],
      };
    }
  },
}));

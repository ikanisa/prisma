import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    update: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    eq: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
  },
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signIn: vi.fn(() => Promise.resolve({ data: { user: {} }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  },
};

// MSW server for API mocking
export const server = setupServer(
  rest.get('*/health', (req, res, ctx) => {
    return res(ctx.json({ status: 'ok' }));
  }),
  rest.post('*/functions/v1/*', (req, res, ctx) => {
    return res(ctx.json({ success: true, data: {} }));
  })
);

// Mock environment variables
Object.defineProperty(process.env, 'VITE_SUPABASE_URL', {
  value: 'https://test.supabase.co',
});
Object.defineProperty(process.env, 'VITE_SUPABASE_ANON_KEY', {
  value: 'test-key',
});

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
})) as any

// Mock ResizeObserver  
global.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
})) as any

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
// Provide fallback Supabase env vars so tests default to demo client
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://demo.invalid.supabase.co';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'public-anon-demo-key';

const ensureEnv = (key: string, value: string) => {
  if (!process.env[key] || String(process.env[key]).trim().length === 0) {
    process.env[key] = value;
  }
};

ensureEnv('AUTH_CLIENT_ID', 'test-client-id');
ensureEnv('AUTH_CLIENT_SECRET', 'test-client-secret');
ensureEnv('AUTH_ISSUER', 'https://auth.example.test/realms/prisma');
ensureEnv('SUPABASE_URL', 'https://supabase.example.test');
ensureEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
ensureEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.test');
ensureEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

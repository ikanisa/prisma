import { vi } from 'vitest';

process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://supabase.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? 'anon-key';
process.env.DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? '00000000-0000-0000-0000-000000000000';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'test-openai-key';

vi.spyOn(console, 'error').mockImplementation(() => {});


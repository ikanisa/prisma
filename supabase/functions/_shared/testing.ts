// Minimal helpers for function unit tests
export function makeEnv(overrides: Record<string, string> = {}) {
  const defaults = new Map<string, string>([
    ['SUPABASE_URL', 'http://localhost:54321'],
    ['SUPABASE_SERVICE_ROLE_KEY', 'local-service-role-key'],
  ]);
  for (const [k, v] of Object.entries(overrides)) {
    defaults.set(k, v);
  }
  for (const [k, v] of defaults.entries()) {
    if (!Deno.env.get(k)) Deno.env.set(k, v);
  }
}


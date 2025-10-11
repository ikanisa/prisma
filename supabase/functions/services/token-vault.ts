// Simple token vault for connector callbacks. In production, replace with
// Deno KV or a secrets manager. For tests/dev, use in-memory map.

const memory = new Map<string, string>();

function key(provider: string, orgId: string): string {
  return `${provider}:${orgId}`;
}

export async function storeToken(provider: string, orgId: string, token: string): Promise<void> {
  try {
    // Placeholder for Deno KV or external secret storage
    memory.set(key(provider, orgId), token);
  } catch (_err) {
    memory.set(key(provider, orgId), token);
  }
}

export async function getToken(provider: string, orgId: string): Promise<string | undefined> {
  return memory.get(key(provider, orgId));
}


const USER_AGENT = 'prisma-glow-password-check/1.0';

async function getSubtleCrypto(): Promise<SubtleCrypto> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle;
  }

  const nodeCrypto = await import('crypto');
  return nodeCrypto.webcrypto.subtle;
}

async function toSha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const subtle = await getSubtleCrypto();
  return subtle.digest('SHA-1', data).then((buffer) => {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  });
}

function isTruthy(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalised = value.toLowerCase();
  return normalised === '1' || normalised === 'true' || normalised === 'yes';
}

const DEFAULT_THRESHOLD = 1;

/**
 * Returns true when the password appears in HaveIBeenPwned within the given threshold.
 */
export async function isPasswordBreached(password: string, threshold: number = DEFAULT_THRESHOLD): Promise<boolean> {
  if (!password) {
    return false;
  }

  const sha1 = await toSha1Hex(password);
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: {
      'Add-Padding': 'true',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`hibp_request_failed_${response.status}`);
  }

  const body = await response.text();
  const lines = body.split('\n');
  for (const line of lines) {
    const [hashSuffix, countString] = line.trim().split(':');
    if (!hashSuffix || !countString) {
      continue;
    }
    if (hashSuffix === suffix) {
      const count = parseInt(countString, 10);
      if (!Number.isNaN(count) && count >= threshold) {
        return true;
      }
    }
  }

  return false;
}

export function isPasswordBreachCheckEnabled(): boolean {
  return isTruthy(import.meta.env.VITE_ENABLE_PWNED_PASSWORD_CHECK);
}

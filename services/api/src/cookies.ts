import { securityEnv } from '@prisma-glow/config/env/security';

export type SameSite = 'lax' | 'strict' | 'none';

export type SecureCookieOptions = {
  httpOnly: boolean;
  sameSite: SameSite;
  secure: boolean;
  path: string;
  domain?: string | null;
  maxAge?: number;
};

export type SecureCookieConfig = {
  name: string;
  options: SecureCookieOptions;
};

function normaliseDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const trimmed = domain.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const baseOptions: SecureCookieOptions = {
  httpOnly: securityEnv.sessionCookieHttpOnly,
  sameSite: securityEnv.sessionCookieSameSite,
  secure: securityEnv.sessionCookieSecure,
  path: securityEnv.sessionCookiePath,
  domain: normaliseDomain(securityEnv.sessionCookieDomain),
};

export function buildSecureCookieOptions(overrides: Partial<SecureCookieOptions> = {}): SecureCookieOptions {
  const merged: SecureCookieOptions = {
    ...baseOptions,
    ...overrides,
    domain: normaliseDomain(overrides.domain ?? baseOptions.domain ?? null),
  };

  if (merged.sameSite === 'none') {
    merged.secure = true;
  }

  return merged;
}

export function getSessionCookieConfig(overrides: Partial<SecureCookieOptions> = {}): SecureCookieConfig {
  return {
    name: securityEnv.sessionCookieName,
    options: buildSecureCookieOptions(overrides),
  };
}

export const sessionCookieConfig: SecureCookieConfig = getSessionCookieConfig();

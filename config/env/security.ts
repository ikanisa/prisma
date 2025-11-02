import { inspect } from 'node:util';
import { z } from 'zod';

const booleanish = z
  .union([z.string(), z.boolean(), z.number()])
  .transform((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalised = value.trim().toLowerCase();
    return normalised === 'true' || normalised === '1' || normalised === 'yes' || normalised === 'on';
  });

const sameSiteEnum = z.enum(['lax', 'strict', 'none']);

const securitySchema = z.object({
  SESSION_COOKIE_NAME: z.string().min(1).default('__Secure-prisma-glow'),
  SESSION_COOKIE_SECRET: z
    .string({ required_error: 'SESSION_COOKIE_SECRET is required' })
    .min(16, 'SESSION_COOKIE_SECRET must be at least 16 characters'),
  SESSION_COOKIE_DOMAIN: z.string().min(1).optional(),
  SESSION_COOKIE_PATH: z.string().min(1).default('/'),
  SESSION_COOKIE_HTTP_ONLY: booleanish.default(true),
  SESSION_COOKIE_SECURE: booleanish.default(true),
  SESSION_COOKIE_SAME_SITE: sameSiteEnum.default('lax'),
  ALLOW_SENTRY_DRY_RUN: booleanish.default(false),
});

const parsed = securitySchema.safeParse({
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECRET: process.env.SESSION_COOKIE_SECRET,
  SESSION_COOKIE_DOMAIN: process.env.SESSION_COOKIE_DOMAIN,
  SESSION_COOKIE_PATH: process.env.SESSION_COOKIE_PATH,
  SESSION_COOKIE_HTTP_ONLY: process.env.SESSION_COOKIE_HTTP_ONLY,
  SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
  SESSION_COOKIE_SAME_SITE: process.env.SESSION_COOKIE_SAME_SITE,
  ALLOW_SENTRY_DRY_RUN: process.env.ALLOW_SENTRY_DRY_RUN,
});

if (!parsed.success) {
  console.error('config.env.security_invalid', inspect(parsed.error.format(), { depth: null }));
  throw new Error('Security environment validation failed');
}

const data = parsed.data;

export const securityEnv = Object.freeze({
  sessionCookieName: data.SESSION_COOKIE_NAME,
  sessionCookieSecret: data.SESSION_COOKIE_SECRET,
  sessionCookieDomain: data.SESSION_COOKIE_DOMAIN ?? null,
  sessionCookiePath: data.SESSION_COOKIE_PATH,
  sessionCookieHttpOnly: data.SESSION_COOKIE_HTTP_ONLY,
  sessionCookieSecure: data.SESSION_COOKIE_SECURE,
  sessionCookieSameSite: data.SESSION_COOKIE_SAME_SITE,
  allowSentryDryRun: data.ALLOW_SENTRY_DRY_RUN,
});

export type SecurityEnv = typeof securityEnv;

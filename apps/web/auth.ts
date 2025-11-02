import 'server-only';

import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { env } from '@/src/env.server';
import { sessionCookieConfig } from '../../services/api/cookies';
import { securityEnv } from '@prisma-glow/config/env/security';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: env.AUTH_CLIENT_ID,
      clientSecret: env.AUTH_CLIENT_SECRET,
      issuer: env.AUTH_ISSUER,
    }),
  ],
  secret: securityEnv.sessionCookieSecret,
  cookies: {
    sessionToken: {
      name: sessionCookieConfig.name,
      options: {
        httpOnly: sessionCookieConfig.options.httpOnly,
        sameSite: sessionCookieConfig.options.sameSite,
        secure: sessionCookieConfig.options.secure,
        path: sessionCookieConfig.options.path,
        domain: sessionCookieConfig.options.domain ?? undefined,
      },
    },
  },
});

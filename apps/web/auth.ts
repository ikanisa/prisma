import 'server-only';

import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { env } from '@/src/env.server';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: env.AUTH_CLIENT_ID,
      clientSecret: env.AUTH_CLIENT_SECRET,
      issuer: env.AUTH_ISSUER,
    }),
  ],
});

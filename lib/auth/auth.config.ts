/**
 * NextAuth.js Configuration (using @aicr/auth)
 *
 * SFP Demo - Startup Funding Platform
 */

import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { createAuthOptionsV4, type AuthConfig } from '@aicr/auth/v4';

const authConfig: AuthConfig = {
  bindingMode: 'synthetic',
  providers: {
    credentials: true,
  },
  synthetic: {
    defaultRole: 'ADMIN',
    defaultTenantId: 'tenant-sfp',
    defaultTenantSlug: 'sfp',
    defaultTenantName: 'Startup Funding Platform',
    defaultTenantTier: 'DEMO',
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

// Create auth options using shared factory
export const authOptions: AuthOptions = createAuthOptionsV4({
  config: authConfig,
  CredentialsProvider,
}) as AuthOptions;

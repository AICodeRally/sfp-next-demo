import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth.config';

/**
 * NextAuth.js API Route Handler for SFP
 *
 * Handles all authentication routes:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/session
 * - /api/auth/callback/:provider
 * - etc.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

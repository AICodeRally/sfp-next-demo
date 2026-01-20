import type { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * NextAuth.js Configuration for SFP Demo
 *
 * Simple credentials provider that accepts any valid email for demo purposes.
 * In production, this would connect to a real user database.
 */
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'email',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials: any) {
        // Demo mode: accept any valid email
        const email = credentials?.email?.trim();
        if (email && email.includes('@')) {
          // Extract name from email (e.g., john.doe@example.com → John Doe)
          const namePart = email.split('@')[0];
          const name = namePart
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());

          return {
            id: `user-${email.replace(/[^a-z0-9]/gi, '-')}`,
            name: name || 'Demo User',
            email: email,
          };
        }
        return null;
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: '/auth/signin',
  },

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, add user data to token
      if (user) {
        token.userId = user.id;
        token.role = 'Founder'; // Default role for SFP demo
      }
      return token;
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

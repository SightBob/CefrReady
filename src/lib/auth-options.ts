import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthConfig, DefaultSession } from 'next-auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'pawatsaekoo@gmail.com';

// Extend the session type to include user ID and admin role
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
    } & DefaultSession['user'];
  }
}

export const authOptions: NextAuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'database',
  },
  callbacks: {
    async session({ session, trigger }) {
      // Look up user by email to get the database ID
      if (session.user?.email) {
        try {
          const dbUser = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, session.user.email!))
            .limit(1);

          if (dbUser && dbUser.length > 0) {
            session.user.id = dbUser[0].id;
          }

          // Set admin role based on email
          session.user.isAdmin = session.user.email === ADMIN_EMAIL;
        } catch (error) {
          console.error('Error fetching user ID in session callback:', error);
        }
      }

      return session;
    },
  },
};

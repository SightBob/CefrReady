import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db, schema } from '../../../../db';
import { eq } from 'drizzle-orm';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  // NextAuth will also error if these are missing, but fail fast here for clarity
  console.warn('Missing Google OAuth env vars: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (!account) return false;
      if (account.provider !== 'google') return false;

      const providerId = account.providerAccountId as string;
      const email = user?.email as string | undefined;

      try {
        // Try to find existing user by provider_id first
        const existing = await db.select().from(schema.users).where(eq(schema.users.providerId, providerId)).limit(1);

        const userData: any = {
          email: email ?? null,
          name: user?.name ?? null,
          provider: 'google',
          providerId,
          image: user?.image ?? null,
        };

        if (profile?.email_verified) {
          userData.emailVerified = new Date();
        }

        if (existing.length > 0) {
          await db.update(schema.users).set(userData).where(eq(schema.users.id, existing[0].id));
        } else {
          await db.insert(schema.users).values(userData);
        }

        return true;
      } catch (err) {
        console.error('Error upserting user on signIn:', err);
        return false;
      }
    },
  },
};

const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };

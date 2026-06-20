import Link from 'next/link';
import { auth } from '@/lib/auth';
import HeaderClient from './HeaderClient';

export default async function Header() {
  const session = await auth();

  return (
    <HeaderClient
      session={session ? {
        user: {
          id: session.user?.id ?? null,
          name: session.user?.name ?? null,
          email: session.user?.email ?? null,
          isAdmin: session.user?.isAdmin ?? false,
        },
      } : null}
    />
  );
}

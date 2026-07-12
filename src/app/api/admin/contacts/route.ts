import { NextResponse } from 'next/server';
import { db } from '@/db';
import { contactMessages, users } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const [unreadResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false));

    const messages = await db
      .select({
        id: contactMessages.id,
        userId: contactMessages.userId,
        accountName: users.name,
        accountEmail: users.email,
        legacyName: contactMessages.name,
        legacyEmail: contactMessages.email,
        legacySubject: contactMessages.subject,
        message: contactMessages.message,
        isRead: contactMessages.isRead,
        createdAt: contactMessages.createdAt,
      })
      .from(contactMessages)
      .leftJoin(users, eq(contactMessages.userId, users.id))
      .orderBy(desc(contactMessages.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      unreadCount: unreadResult?.count || 0,
      data: messages,
    });
  } catch (err) {
    console.error('[admin/contacts] Failed to fetch:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch contacts' }, { status: 500 });
  }
}

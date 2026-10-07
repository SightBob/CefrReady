import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  grammarTopic: z.string().trim().min(1).max(200),
  bound: z.boolean(),
});

/**
 * PUT /api/admin/test-sets/[id]/explains
 * ผูก/ยกเลิกการผูกเนื้อหา explain ของ "เรื่อง" หนึ่งเข้ากับชุดข้อสอบนี้
 * body: { grammarTopic: string, bound: boolean }
 *
 * ชุดข้อสอบที่มีหลายเรื่อง (ข้อสอบรวมเรื่องเล็ก ๆ เข้าด้วยกัน) จะมี explain ผูกได้หลายอัน
 * คนละ grammarTopic — หน้าสอบใช้ความผูกนี้เปิดเนื้อหาของเรื่องนั้นตอนขึ้นเรื่องใหม่
 *
 * เขียนเฉพาะคอลัมน์ testSetIds (+updatedAt) เท่านั้น: ถ้าเขียนทับทั้งแถวจะชนกับ
 * การแก้เนื้อหาที่ทำอยู่พร้อมกันในหน้า /admin/test-explains
 */
export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error } = await requireAdmin();
  if (error) return error;

  const setId = parseInt(params.id);
  if (isNaN(setId)) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'กรุณาระบุ grammarTopic และ bound ให้ถูกต้อง' }, { status: 400 });
  }
  const { grammarTopic, bound } = parsed.data;

  try {
    const [explain] = await db
      .select({ id: testExplains.id, testSetIds: testExplains.testSetIds })
      .from(testExplains)
      .where(eq(testExplains.grammarTopic, grammarTopic))
      .limit(1);

    if (!explain) {
      return NextResponse.json({ success: false, error: 'ยังไม่มีเนื้อหา explain ของเรื่องนี้' }, { status: 404 });
    }

    const current = explain.testSetIds ?? [];
    const next = bound
      ? [...new Set([...current, setId])].sort((a, b) => a - b)
      : current.filter((id) => id !== setId);

    await db
      .update(testExplains)
      .set({ testSetIds: next, updatedAt: new Date() })
      .where(eq(testExplains.id, explain.id));

    return NextResponse.json({ success: true, data: { grammarTopic, testSetIds: next } });
  } catch (err) {
    console.error('[admin/test-sets/id/explains] PUT error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update explain binding' }, { status: 500 });
  }
}

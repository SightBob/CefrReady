import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import { normalizeLessonSections } from '@/lib/lesson-sections';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Export every test explain as structured JSON. The payload is also the exact
// shape the import endpoint accepts (round-trip safe), so admins can download,
// edit offline (or with an AI assistant), and re-import.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const rows = await db.select().from(testExplains).orderBy(asc(testExplains.id));
    return NextResponse.json(
      {
        format: 'cefr-ready/test-explains@1',
        exportedAt: new Date().toISOString(),
        count: rows.length,
        explains: rows,
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="test-explains-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      },
    );
  } catch (err) {
    console.error('[admin/test-explains/export] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to export test explains' }, { status: 500 });
  }
}

// Upsert-style bulk import keyed by grammarTopic:
//  - grammarTopic exists  → update that explain (title/intro/sections/tip/isPublished)
//  - grammarTopic is new  → insert
// Sections always pass through normalizeLessonSections, so legacy shapes and
// unknown extra keys are tolerated the same way the single-item API does.
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const body = (await request.json()) as {
      explains?: unknown;
      mode?: string;
    };
    const items = Array.isArray(body.explains) ? body.explains : null;
    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรายการ explains ในไฟล์ — ต้องเป็น JSON ที่มี explains เป็น array' }, { status: 400 });
    }

    const upsert = body.mode === 'upsert';
    const results: Array<{ grammarTopic: string; status: 'created' | 'updated' | 'error'; message?: string }> = [];
    const seen = new Set<string>();

    for (let index = 0; index < items.length; index++) {
      const raw = items[index] as Record<string, unknown> | null;
      const label = typeof raw?.grammarTopic === 'string' ? raw.grammarTopic : `รายการที่ ${index + 1}`;
      try {
        if (!raw || typeof raw !== 'object') throw new Error('รายการไม่ใช่ object');
        const grammarTopic = typeof raw.grammarTopic === 'string' ? raw.grammarTopic.trim() : '';
        const title = typeof raw.title === 'string' ? raw.title.trim() : '';
        if (!grammarTopic || grammarTopic.length > 200) throw new Error('grammarTopic หายไป หรือยาวเกิน 200 ตัวอักษร');
        if (!title || title.length > 200) throw new Error('title หายไป หรือยาวเกิน 200 ตัวอักษร');
        if (!Array.isArray(raw.sections) || raw.sections.length === 0) throw new Error('sections ต้องเป็น array ที่มีอย่างน้อย 1 รายการ');
        const duplicate = seen.has(grammarTopic);
        if (duplicate) throw new Error('grammarTopic ซ้ำภายในไฟล์เดียวกัน');
        seen.add(grammarTopic);

        const sections = normalizeLessonSections(raw.sections);
        const hasContent = sections.some(
          (section) =>
            section.heading?.trim() || section.body?.trim() || section.chip?.trim() || section.description?.trim() ||
            section.rows?.some((row) => row.left.trim() || row.right?.trim()) ||
            section.examples?.some((example) => example.en.trim()) ||
            section.practice?.questions?.some((question) => question.sentence.trim()),
        );
        if (!hasContent) throw new Error('ต้องมีเนื้อหา explain อย่างน้อย 1 ส่วน');

        const values = {
          grammarTopic,
          title,
          intro: typeof raw.intro === 'string' ? raw.intro.trim() || null : null,
          sections,
          tip: typeof raw.tip === 'string' ? raw.tip.trim() || null : null,
          isPublished: raw.isPublished === true,
        };

        const [existing] = await db.select({ id: testExplains.id }).from(testExplains).where(eq(testExplains.grammarTopic, grammarTopic)).limit(1);
        if (existing && !upsert) {
          results.push({ grammarTopic, status: 'error', message: 'มี grammarTopic นี้อยู่แล้วในระบบ (ตั้ง mode: "upsert" เพื่ออนุญาตให้อัปเดตทับ)' });
          continue;
        }
        if (existing) {
          await db.update(testExplains).set({ ...values, updatedAt: new Date() }).where(eq(testExplains.id, existing.id));
          results.push({ grammarTopic, status: 'updated' });
        } else {
          await db.insert(testExplains).values(values);
          results.push({ grammarTopic, status: 'created' });
        }
      } catch (itemError) {
        results.push({ grammarTopic: label, status: 'error', message: itemError instanceof Error ? itemError.message : 'ข้อมูลไม่ถูกต้อง' });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const updated = results.filter((r) => r.status === 'updated').length;
    const failed = results.filter((r) => r.status === 'error');
    return NextResponse.json({
      success: failed.length === 0,
      message: `นำเข้าสำเร็จ: สร้างใหม่ ${created} · อัปเดต ${updated} · ผิดพลาด ${failed.length}`,
      created,
      updated,
      failed: failed.length,
      results,
    });
  } catch (err) {
    console.error('[admin/test-explains/export] POST error:', err);
    return NextResponse.json({ success: false, error: 'Failed to import test explains' }, { status: 500 });
  }
}

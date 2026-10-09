import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import { lessonSectionsHaveContent, normalizeLessonSections } from '@/lib/lesson-sections';
import { requireAdmin } from '@/lib/admin-auth';
import { collectItemIssues } from '@/lib/test-explain-validation';
import { resolveContentStatus } from '@/lib/explain-visibility';

// Export test explains as structured JSON. The payload is also the exact
// shape the import endpoint accepts (round-trip safe), so admins can download,
// edit offline (or with an AI assistant), and re-import.
// - GET              → every explain
// - GET ?id=<number> → a single explain (ทีละบท) wrapped in the same explains array
//   so the per-lesson file can go straight back through the same import endpoint.
export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;
  try {
    const idParam = new URL(request.url).searchParams.get('id');
    let rows;
    let filename = `test-explains-${new Date().toISOString().slice(0, 10)}.json`;

    if (idParam !== null) {
      const id = Number(idParam);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ success: false, error: 'id ต้องเป็นเลขจำนวนเต็มบวก' }, { status: 400 });
      }
      const [single] = await db.select().from(testExplains).where(eq(testExplains.id, id)).limit(1);
      if (!single) {
        return NextResponse.json({ success: false, error: 'ไม่พบ explain ที่ต้องการส่งออก' }, { status: 404 });
      }
      rows = [single];
      // ตั้งชื่อไฟล์จาก grammarTopic ให้เดาง่ายว่าไฟล์นี้คือบทไหน
      const safeTopic = String(single.grammarTopic)
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || `explain-${id}`;
      filename = `test-explain-${safeTopic}.json`;
    } else {
      rows = await db.select().from(testExplains).orderBy(asc(testExplains.id));
    }

    return NextResponse.json(
      {
        format: 'cefr-ready/test-explains@1',
        exportedAt: new Date().toISOString(),
        count: rows.length,
        explains: rows,
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      },
    );
  } catch (err) {
    console.error('[admin/test-explains/export] GET error:', err);
    return NextResponse.json({ success: false, error: 'Failed to export test explains' }, { status: 500 });
  }
}

// Upsert-style bulk import keyed by grammarTopic(s):
//  - topics exist          → update that explain (title/intro/sections/tip/status)
//  - topics are all new    → insert
// รองรับทั้ง `grammarTopic` (หัวข้อเดียว แบบเดิม) และ `grammarTopics` (หลายหัวข้อ — ตัวแรกคือหัวข้อหลัก)
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
    const results: Array<{ grammarTopic: string; status: 'created' | 'updated' | 'error'; message?: string; warnings?: string[] }> = [];
    const seen = new Set<string>();

    for (let index = 0; index < items.length; index++) {
      const raw = items[index] as Record<string, unknown> | null;
      const label = typeof raw?.grammarTopic === 'string' ? raw.grammarTopic : `รายการที่ ${index + 1}`;
      try {
        if (!raw || typeof raw !== 'object') throw new Error('รายการไม่ใช่ object');
        const rawTopics = [
          ...(Array.isArray(raw.grammarTopics) ? raw.grammarTopics : []),
          ...(typeof raw.grammarTopic === 'string' ? [raw.grammarTopic] : []),
        ];
        const grammarTopics = [...new Set(
          rawTopics.map((topic) => (typeof topic === 'string' ? topic.trim() : '')).filter(Boolean),
        )].slice(0, 50);
        const grammarTopic = grammarTopics[0] ?? '';
        const title = typeof raw.title === 'string' ? raw.title.trim() : '';
        if (!grammarTopic || grammarTopic.length > 200) throw new Error('grammarTopic หายไป หรือยาวเกิน 200 ตัวอักษร');
        if (!title || title.length > 200) throw new Error('title หายไป หรือยาวเกิน 200 ตัวอักษร');
        if (!Array.isArray(raw.sections) || raw.sections.length === 0) throw new Error('sections ต้องเป็น array ที่มีอย่างน้อย 1 รายการ');
        const duplicateTopic = grammarTopics.find((topic) => seen.has(topic));
        if (duplicateTopic) throw new Error(`หัวข้อ "${duplicateTopic}" ซ้ำภายในไฟล์เดียวกัน`);
        for (const topic of grammarTopics) seen.add(topic);

        // ตรวจโครงสร้างละเอียดก่อน normalize — พบ error ให้ข้ามรายการนี้พร้อมบอกตำแหน่งที่ผิดทุกจุด
        const issues = collectItemIssues(raw);
        if (issues.errors.length) throw new Error(issues.errors.join(' · '));

        const sections = normalizeLessonSections(raw.sections);
        if (!lessonSectionsHaveContent(sections)) throw new Error('ต้องมีเนื้อหา explain อย่างน้อย 1 ส่วน');

        // status ใหม่มาก่อน — ไฟล์เก่าที่มีแต่ isPublished ยังนำเข้าได้ (true = published)
        const status = resolveContentStatus(raw);
        if (!status) throw new Error('status ไม่ถูกต้อง — ใช้ draft, review, published หรือ hidden');

        const values = {
          grammarTopic,
          grammarTopics,
          title,
          intro: typeof raw.intro === 'string' ? raw.intro.trim() || null : null,
          sections,
          tip: typeof raw.tip === 'string' ? raw.tip.trim() || null : null,
          status,
        };

        // หาของเดิมด้วยหัวข้อใดหัวข้อหนึ่งที่รายการนี้ใช้ (หัวข้อหลักหรือหัวข้อรองก็ตาม)
        const [existing] = await db.select({ id: testExplains.id }).from(testExplains)
          .where(or(
            inArray(testExplains.grammarTopic, grammarTopics),
            ...grammarTopics.map((topic) => sql`${testExplains.grammarTopics} ? ${topic}`),
          ))
          .limit(1);
        if (existing && !upsert) {
          results.push({ grammarTopic, status: 'error', message: 'มี grammarTopic นี้อยู่แล้วในระบบ (ตั้ง mode: "upsert" เพื่ออนุญาตให้อัปเดตทับ)' });
          continue;
        }
        if (existing) {
          await db.update(testExplains).set({ ...values, updatedAt: new Date() }).where(eq(testExplains.id, existing.id));
          results.push({ grammarTopic, status: 'updated', warnings: issues.warnings });
        } else {
          await db.insert(testExplains).values(values);
          results.push({ grammarTopic, status: 'created', warnings: issues.warnings });
        }
      } catch (itemError) {
        results.push({ grammarTopic: label, status: 'error', message: itemError instanceof Error ? itemError.message : 'ข้อมูลไม่ถูกต้อง' });
      }
    }

    const created = results.filter((r) => r.status === 'created').length;
    const updated = results.filter((r) => r.status === 'updated').length;
    const failed = results.filter((r) => r.status === 'error');
    const warningCount = results.reduce((sum, r) => sum + (r.warnings?.length ?? 0), 0);
    return NextResponse.json({
      success: failed.length === 0,
      message: `นำเข้าสำเร็จ: สร้างใหม่ ${created} · อัปเดต ${updated} · ผิดพลาด ${failed.length}${warningCount ? ` · คำเตือน ${warningCount}` : ''}`,
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

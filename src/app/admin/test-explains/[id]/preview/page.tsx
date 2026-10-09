import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { testExplains } from '@/db/schema';
import TestSetExplainView from '@/components/TestSetExplainView';
import { buildAdminExplainPreview } from '@/lib/explain-preview';
import { explainTopicsOf, findExplainQuizTarget } from '@/lib/test-explains';

export const dynamic = 'force-dynamic';

/**
 * พรีวิว "หน้าอธิบายจริง" ของแอดมิน — เข้าถึงได้เฉพาะใน /admin (layout ตรวจสิทธิ์ผู้ดูแลแล้ว)
 *
 * ใช้คอมโพเนนต์เดียวกับหน้าผู้เรียน (TestSetExplainView → LessonLayout + ReviewContent)
 * จึงเห็นของจริงทุกจุด แต่ **ไม่กรองสถานะ** เพื่อให้ตรวจ ฉบับร่าง / รอตรวจสอบ / ปิดชั่วคราว
 * ได้ก่อนเผยแพร่ และตัดส่วนที่เป็นฉบับร่างออกเหมือนที่ผู้เรียนจะได้รับจริง
 *
 * หน้าผู้เรียน (/tests/.../explain และ overlay ตอนทำข้อสอบ) ยังคงเห็นเฉพาะ published
 */
export default async function AdminExplainPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const explainId = Number(id);
  if (!Number.isInteger(explainId) || explainId <= 0) notFound();

  const row = await db
    .select()
    .from(testExplains)
    .where(eq(testExplains.id, explainId))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) notFound();

  const preview = buildAdminExplainPreview({ status: row.status, sections: row.sections });

  // ชุดข้อสอบที่เนื้อหานี้จะถูกใช้จริง — ผูกไว้ก่อน ถ้าไม่ได้ผูกก็หาจากข้อสอบที่ใช้
  // หัวข้อใดหัวข้อหนึ่งที่เนื้อหานี้เชื่อมไว้ (รองรับหลาย grammarTopic)
  const target = await findExplainQuizTarget({
    grammarTopics: explainTopicsOf(row),
    boundSetIds: row.testSetIds,
  });

  const editorHref = `/admin/test-explains/${row.id}`;
  const quizHref = target ? `/tests/${target.sectionId}/${target.setId}` : editorHref;
  // โหมดพรีวิว: เปิดตรงข้อแรกของเรื่องนี้ ไม่งั้นแอดมินต้องทำข้อสอบไปเรื่อย ๆ กว่าจะเจอเนื้อหา
  const quizPreviewHref = target
    ? `/tests/${target.sectionId}/${target.setId}?preview=1&topic=${encodeURIComponent(row.grammarTopic)}`
    : undefined;

  return (
    <TestSetExplainView
      title={row.title}
      entries={[{ title: row.title, intro: row.intro, tip: row.tip, sections: preview.sections }]}
      sectionId={target?.sectionId ?? ''}
      quizHref={quizHref}
      backHref={editorHref}
      notice={
        target
          ? `${preview.notice} · เนื้อหานี้ถูกใช้ในชุด “${target.name}”`
          : `${preview.notice} · ยังไม่มีชุดข้อสอบที่มีข้อใช้หัวข้อนี้ จึงเปิดหน้าทำข้อสอบจริงไม่ได้`
      }
      noticeTone={preview.learnerSeesNothing ? 'warning' : 'info'}
      primaryLabel={target ? 'ไปหน้าทำข้อสอบ' : 'กลับไปแก้ไขเนื้อหา'}
      noticeAction={
        quizPreviewHref
          ? { label: 'เปิดหน้าทำข้อสอบจริง (โหมดพรีวิวของแอดมิน)', href: quizPreviewHref }
          : undefined
      }
    />
  );
}

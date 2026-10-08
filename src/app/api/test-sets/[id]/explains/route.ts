import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminRequest } from '@/lib/admin-auth';
import { explainsByTopic, fetchExplainsForSet, fetchExplainsForSetPreview } from '@/lib/test-explains';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-sets/[id]/explains
 * Auth-required endpoint: เนื้อหา explain ทุกเรื่องที่ผูกไว้กับชุดนี้ (เผยแพร่แล้ว)
 * คืนเป็น map คีย์ตาม grammarTopic เพื่อให้หน้าสอบเด้ง intro+explain ตอนขึ้นเรื่องใหม่
 *
 * ชุดที่มีเรื่องเดียวจะได้ 1 คีย์ → พฤติกรรมเดิม (อ่านจากหน้า /explain ก่อนเข้าสอบ)
 * และยังเปิดผ่านปุ่ม “โหมดทบทวน” ได้เหมือนเดิม
 *
 * ?preview=1 = โหมดพรีวิวสำหรับแอดมิน: คืนเนื้อหาทุกสถานะ (ตรวจสิทธิ์ที่ฝั่งเซิร์ฟเวอร์)
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const setId = parseInt(params.id);
  if (isNaN(setId)) {
    return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
  }

  const preview = req.nextUrl.searchParams.get('preview') === '1';
  if (preview && !(await isAdminRequest())) {
    return NextResponse.json(
      { success: false, error: 'โหมดพรีวิวใช้ได้เฉพาะบัญชีผู้ดูแล' },
      { status: 403 },
    );
  }

  try {
    const explains = preview
      ? await fetchExplainsForSetPreview(setId)
      : await fetchExplainsForSet(setId);
    return NextResponse.json(
      { success: true, data: explainsByTopic(explains) },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    console.error('[api/test-sets/id/explains] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch explains' }, { status: 500 });
  }
}

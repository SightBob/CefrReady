import { NextRequest, NextResponse } from 'next/server';

import { withAdmin } from '@/lib/admin-route';
import { parseAiTutorMessageFilters } from '@/lib/ai-tutor/admin-message-filters';
import { listAiTutorMessages } from '@/lib/ai-tutor/admin-messages';
import { AI_TUTOR_MIGRATION_MISSING_MESSAGE, warnWithSummary } from '@/lib/ai-tutor/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai-tutor/messages — คำถาม/คำตอบของผู้เรียน (อ่านอย่างเดียว)
 *
 * พารามิเตอร์:
 * - days       ช่วงเวลา (วัน) · ค่าเริ่มต้ม 30 · สูงสุด 365
 * - role       user (ค่าเริ่มต้ม) | assistant | all
 * - status     all (ค่าเริ่มต้ม) | ok | failed | pending
 * - questionId กรองเฉพาะข้อสอบข้อนั้น
 * - q          ค้นหาในข้อความ (substring)
 * - page       หน้าที่แสดง (ค่าเริ่มต้ม 1)
 * - includeArchived  0 = ไม่เอาแถวที่ถูกเก็บถัง (รอบที่จบแล้ว) · ค่าเริ่มต้ม = เอา
 */
export async function GET(request: NextRequest) {
  const { error } = await withAdmin({ keySuffix: 'admin:ai-tutor-messages', maxRequests: 60 });
  if (error) return error;

  const filters = parseAiTutorMessageFilters(new URL(request.url).searchParams);

  try {
    const { rows, total, summary } = await listAiTutorMessages(filters);
    const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

    return NextResponse.json({
      success: true,
      data: {
        rows: rows.map((row) => ({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          role: row.role,
          status: row.status,
          content: row.content,
          archived: row.archived,
          questionId: row.questionId,
          questionText: row.questionText,
          cefrLevel: row.cefrLevel,
          grammarTopic: row.grammarTopic,
          userId: row.userId,
          userEmail: row.userEmail,
          userName: row.userName,
          model: row.model,
          latencyMs: row.latencyMs,
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
          selectedAnswer: row.selectedAnswer,
          isCorrect: row.isCorrect,
          attemptKey: row.attemptKey,
        })),
        summary,
      },
      meta: { total, page: filters.page, totalPages, pageSize: filters.pageSize, filters },
    });
  } catch (error) {
    // ตารางยังไม่มี (migration 0045–0049 ยังไม่รัน) หรือ DB ล่ม → 503 พร้อมข้อความชัดเจน
    warnWithSummary('ai-tutor] อ่านคำถามของผู้เรียนไม่สำเร็จ', error);
    return NextResponse.json(
      { success: false, error: AI_TUTOR_MIGRATION_MISSING_MESSAGE },
      { status: 503 },
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/db';
import { testAttempts, users, testTypes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const attempts = await db
      .select({
        id: testAttempts.id,
        userName: users.name,
        userEmail: users.email,
        testType: testTypes.name,
        score: testAttempts.score,
        correctAnswers: testAttempts.correctAnswers,
        totalQuestions: testAttempts.totalQuestions,
        startedAt: testAttempts.startedAt,
        completedAt: testAttempts.completedAt,
      })
      .from(testAttempts)
      .leftJoin(users, eq(testAttempts.userId, users.id))
      .leftJoin(testTypes, eq(testAttempts.testTypeId, testTypes.id))
      .orderBy(desc(testAttempts.completedAt))
      .limit(5000);

    const headers = [
      'ID',
      'ชื่อผู้สอบ',
      'อีเมล',
      'ประเภทข้อสอบ',
      'คะแนน (%)',
      'ถูก',
      'ทั้งหมด',
      'วันเริ่ม',
      'วันที่ส่ง',
    ];

    const formatDate = (d: Date | string | null) =>
      d ? new Date(d).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : '-';

    const rows = attempts.map((a) => [
      a.id,
      a.userName || '-',
      a.userEmail || '-',
      a.testType || '-',
      a.score || '0',
      a.correctAnswers ?? 0,
      a.totalQuestions ?? 0,
      formatDate(a.startedAt),
      formatDate(a.completedAt),
    ]);

    const escape = (v: unknown) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const csv = [headers, ...rows]
      .map((row) => row.map(escape).join(','))
      .join('\n');

    const BOM = '\uFEFF'; // UTF-8 BOM for Excel Thai charset support

    return new NextResponse(BOM + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cefr-results-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

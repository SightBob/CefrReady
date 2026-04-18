import { NextResponse } from 'next/server';
import { db } from '@/db';
import { questions } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/questions/duplicates
 * Returns groups of questions that have identical questionText (case-insensitive, trimmed)
 * within the same testTypeId.
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    // Find all question groups with duplicated questionText within same testTypeId
    const duplicateGroups = await db.execute(sql`
      SELECT
        q.id,
        q."testTypeId",
        q."questionText",
        q."cefrLevel",
        q.difficulty,
        q.active,
        q."createdAt",
        LOWER(TRIM(q."questionText")) AS normalized_text
      FROM questions q
      INNER JOIN (
        SELECT
          "testTypeId",
          LOWER(TRIM("questionText")) AS normalized_text,
          COUNT(*) AS cnt
        FROM questions
        GROUP BY "testTypeId", LOWER(TRIM("questionText"))
        HAVING COUNT(*) > 1
      ) dup
        ON q."testTypeId" = dup."testTypeId"
        AND LOWER(TRIM(q."questionText")) = dup.normalized_text
      ORDER BY q."testTypeId", normalized_text, q."createdAt" ASC
    `);

    // Group the flat results into clusters
    const rows = duplicateGroups.rows as {
      id: number;
      testTypeId: string;
      questionText: string;
      cefrLevel: string;
      difficulty: string | null;
      active: string;
      createdAt: string;
      normalized_text: string;
    }[];

    const groupMap = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.testTypeId}::${row.normalized_text}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(row);
    }

    const groups = Array.from(groupMap.values()).map((items) => ({
      testTypeId: items[0].testTypeId,
      normalizedText: items[0].normalized_text,
      count: items.length,
      questions: items.map(({ normalized_text: _n, ...rest }) => rest),
    }));

    return NextResponse.json({
      totalDuplicateGroups: groups.length,
      totalDuplicateQuestions: rows.length,
      groups,
    });
  } catch (err) {
    console.error('Error finding duplicates:', err);
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 });
  }
}
